import { and, eq, sql } from "drizzle-orm";

import { availabilityService, intervalsOverlap } from "@/lib/appointments/availability";
import { hasBlockingOccupiedOverlap } from "@/lib/appointments/occupancy";
import {
  APPOINTMENT_RATE_LIMITS,
  BOOKING_IDEMPOTENCY_KEY_PATTERN,
  BOOKING_IDEMPOTENCY_TTL_MS,
  BOOKING_OPERATION,
  BOOKING_SAFE_MESSAGES,
  PRACTICE_TIMEZONE,
  PUBLIC_APPOINTMENT_TYPE_ID_PATTERN,
} from "@/lib/appointments/constants";
import type { AppointmentQueryDb } from "@/lib/appointments/db-types";
import {
  BookingDomainError,
  isExclusionViolation,
  isOccupancyContention,
  postgresErrorCode,
  safeBookingFailure,
  type BookingErrorCode,
} from "@/lib/appointments/errors";
import {
  appointmentHistory,
  appointmentNotificationOutbox,
  appointmentTypes,
  appointments,
  bookingIdempotency,
} from "@/lib/appointments/schema";
import { formatLocalDate } from "@/lib/appointments/timezone";
import { appendAuditLog } from "@/lib/identity/audit";
import {
  authorizationService,
  type AuthorizationPrincipal,
} from "@/lib/identity/authorization";
import type { IdentityContext } from "@/lib/identity/context";
import { generatePublicId, generateUuid, hashWithSecret } from "@/lib/identity/crypto";
import { lockPsychologistCalendar } from "@/lib/appointments/lock";
import type { IdentityDb } from "@/lib/identity/db";
import { users } from "@/lib/identity/schema";
import { logStructured } from "@/lib/observability/logger";

export type BookableAppointmentTypeView = {
  publicId: string;
  name: string;
  durationMinutes: number;
};

export type AppointmentBookingView = {
  publicId: string;
  appointmentType: BookableAppointmentTypeView;
  date: string;
  start: string;
  end: string;
  timezone: string;
  status: "PENDING";
};

export type BookingSuccess = {
  ok: true;
  appointment: AppointmentBookingView;
  message: string;
  replayed?: boolean;
};

export type BookingFailure = {
  ok: false;
  code: BookingErrorCode;
  message: string;
};

export type BookingResult = BookingSuccess | BookingFailure;

export type BookingTransactionHooks = {
  afterAppointmentInsert?: () => Promise<void> | void;
  afterHistoryInsert?: () => Promise<void> | void;
  afterOutboxInsert?: () => Promise<void> | void;
};

export type AppointmentBookingInput = {
  principal: AuthorizationPrincipal | null;
  ipAddress?: string | null;
  appointmentTypePublicId: string;
  requestedStart: string;
  idempotencyKey?: string | null;
  hooks?: BookingTransactionHooks;
};

type BookablePatient = {
  userId: string;
  principal: AuthorizationPrincipal;
};

type StoredBookingPayload = {
  ok: true;
  appointment: AppointmentBookingView;
  message: string;
} | {
  ok: false;
  code: BookingErrorCode;
  message: string;
};

function asQueryDb(db: IdentityDb | AppointmentQueryDb): AppointmentQueryDb {
  return db;
}

function asIdentityDb(db: AppointmentQueryDb): IdentityDb {
  return db as IdentityDb;
}

function hashBookingSecret(
  ctx: IdentityContext,
  value: string,
): string {
  const secret = ctx.config.sessionSecret;
  if (!secret) {
    throw new BookingDomainError(
      "NOT_CONFIGURED",
      BOOKING_SAFE_MESSAGES.outsideAvailability,
    );
  }
  return hashWithSecret("booking-idempotency", value, secret);
}

function idempotencyKeyHash(
  ctx: IdentityContext,
  userId: string,
  key: string,
): string {
  return hashBookingSecret(ctx, `${userId}|${BOOKING_OPERATION}|${key}`);
}

function requestFingerprint(
  ctx: IdentityContext,
  appointmentTypePublicId: string,
  startsAt: Date,
): string {
  return hashBookingSecret(
    ctx,
    `fp:${appointmentTypePublicId}|${startsAt.toISOString()}`,
  );
}

async function consumeBookingRateLimits(
  ctx: IdentityContext,
  input: { userId?: string; ipAddress?: string | null },
): Promise<boolean> {
  const ip = input.ipAddress?.trim() || "unknown";
  const ipLimit = await ctx.rateLimit.consume(
    `appointment-book-ip:${ip}`,
    APPOINTMENT_RATE_LIMITS.request.max,
    APPOINTMENT_RATE_LIMITS.request.windowMs,
  );
  if (!ipLimit.allowed) {
    return false;
  }
  if (input.userId) {
    const userLimit = await ctx.rateLimit.consume(
      `appointment-book-user:${input.userId}`,
      APPOINTMENT_RATE_LIMITS.request.max,
      APPOINTMENT_RATE_LIMITS.request.windowMs,
    );
    if (!userLimit.allowed) {
      return false;
    }
  }
  return true;
}

async function loadBookablePatient(
  ctx: IdentityContext,
  db: AppointmentQueryDb,
  principal: AuthorizationPrincipal,
): Promise<BookablePatient> {
  const [user] = await db
    .select({
      id: users.id,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      mobileVerifiedAt: users.mobileVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, principal.userId))
    .limit(1);
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    !user.mobileVerifiedAt
  ) {
    throw new BookingDomainError("FORBIDDEN", BOOKING_SAFE_MESSAGES.forbidden);
  }
  return { userId: user.id, principal };
}

export async function authorizeBookablePatient(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
): Promise<
  | { ok: true; patient: BookablePatient }
  | { ok: false; code: BookingErrorCode; message: string }
> {
  const decision = authorizationService.canAccess(principal, {
    roles: ["PATIENT"],
  });
  if (!decision.allowed) {
    if (decision.reason === "unauthenticated") {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: BOOKING_SAFE_MESSAGES.unauthenticated,
      };
    }
    return {
      ok: false,
      code: "FORBIDDEN",
      message: BOOKING_SAFE_MESSAGES.forbidden,
    };
  }
  if (!principal) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: BOOKING_SAFE_MESSAGES.unauthenticated,
    };
  }
  try {
    const patient = await loadBookablePatient(ctx, ctx.db, principal);
    return { ok: true, patient };
  } catch (error) {
    return safeBookingFailure(error);
  }
}

function parseRequestedStart(value: string): Date {
  const startsAt = new Date(value);
  if (Number.isNaN(startsAt.getTime())) {
    throw new BookingDomainError(
      "VALIDATION",
      BOOKING_SAFE_MESSAGES.invalidRequest,
    );
  }
  return startsAt;
}

function resolveIdempotencyKey(raw: string | null | undefined): string {
  const key = raw?.trim() ?? "";
  if (!key) {
    return generateUuid();
  }
  if (!BOOKING_IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new BookingDomainError(
      "VALIDATION",
      BOOKING_SAFE_MESSAGES.invalidRequest,
    );
  }
  return key;
}

async function lockPsychologist(
  db: AppointmentQueryDb,
  psychologistUserId: string,
): Promise<void> {
  await lockPsychologistCalendar(db, psychologistUserId);
}

async function resolveAppointmentType(
  db: AppointmentQueryDb,
  appointmentTypePublicId: string,
) {
  if (!PUBLIC_APPOINTMENT_TYPE_ID_PATTERN.test(appointmentTypePublicId)) {
    throw new BookingDomainError(
      "TYPE_UNAVAILABLE",
      BOOKING_SAFE_MESSAGES.typeUnavailable,
    );
  }
  const [appointmentType] = await db
    .select({
      id: appointmentTypes.id,
      publicId: appointmentTypes.publicId,
      psychologistUserId: appointmentTypes.psychologistUserId,
      name: appointmentTypes.name,
      durationMinutes: appointmentTypes.durationMinutes,
      bufferBeforeMinutes: appointmentTypes.bufferBeforeMinutes,
      bufferAfterMinutes: appointmentTypes.bufferAfterMinutes,
      active: appointmentTypes.active,
    })
    .from(appointmentTypes)
    .where(eq(appointmentTypes.publicId, appointmentTypePublicId))
    .limit(1);
  if (
    !appointmentType ||
    !appointmentType.active ||
    appointmentType.durationMinutes <= 0 ||
    appointmentType.bufferBeforeMinutes < 0 ||
    appointmentType.bufferAfterMinutes < 0
  ) {
    throw new BookingDomainError(
      "TYPE_UNAVAILABLE",
      BOOKING_SAFE_MESSAGES.typeUnavailable,
    );
  }
  return appointmentType;
}

function toStoredPayload(result: StoredBookingPayload): Record<string, unknown> {
  if (result.ok) {
    return {
      ok: true,
      message: result.message,
      appointment: result.appointment,
    };
  }
  return {
    ok: false,
    code: result.code,
    message: result.message,
  };
}

function fromStoredPayload(payload: Record<string, unknown> | null): StoredBookingPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.ok === true && payload.appointment && typeof payload.appointment === "object") {
    const appointment = payload.appointment as AppointmentBookingView;
    if (
      typeof appointment.publicId !== "string" ||
      typeof appointment.start !== "string" ||
      typeof appointment.end !== "string"
    ) {
      return null;
    }
    return {
      ok: true,
      appointment,
      message:
        typeof payload.message === "string"
          ? payload.message
          : BOOKING_SAFE_MESSAGES.recorded,
    };
  }
  if (payload.ok === false && typeof payload.message === "string") {
    return {
      ok: false,
      code: typeof payload.code === "string" ? (payload.code as BookingErrorCode) : "VALIDATION",
      message: payload.message,
    };
  }
  return null;
}

async function loadIdempotencyRow(
  db: AppointmentQueryDb,
  userId: string,
  keyHash: string,
) {
  const [row] = await db
    .select()
    .from(bookingIdempotency)
    .where(
      and(
        eq(bookingIdempotency.userId, userId),
        eq(bookingIdempotency.operation, BOOKING_OPERATION),
        eq(bookingIdempotency.keyHash, keyHash),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function claimIdempotency(
  ctx: IdentityContext,
  db: AppointmentQueryDb,
  input: {
    userId: string;
    keyHash: string;
    fingerprint: string;
  },
): Promise<StoredBookingPayload | "claimed"> {
  const now = ctx.now();
  await db
    .insert(bookingIdempotency)
    .values({
      id: generateUuid(),
      userId: input.userId,
      operation: BOOKING_OPERATION,
      keyHash: input.keyHash,
      requestFingerprint: input.fingerprint,
      status: "IN_PROGRESS",
      responsePublicId: null,
      responsePayload: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + BOOKING_IDEMPOTENCY_TTL_MS),
    })
    .onConflictDoNothing({
      target: [
        bookingIdempotency.userId,
        bookingIdempotency.operation,
        bookingIdempotency.keyHash,
      ],
    });

  await db.execute(
    sql`select id from booking_idempotency
        where user_id = ${input.userId}
          and operation = ${BOOKING_OPERATION}
          and key_hash = ${input.keyHash}
        for update`,
  );

  const row = await loadIdempotencyRow(db, input.userId, input.keyHash);
  if (!row) {
    throw new BookingDomainError(
      "VALIDATION",
      BOOKING_SAFE_MESSAGES.invalidRequest,
    );
  }
  if (row.status === "COMPLETED") {
    if (row.requestFingerprint !== input.fingerprint) {
      throw new BookingDomainError(
        "IDEMPOTENCY_CONFLICT",
        BOOKING_SAFE_MESSAGES.idempotencyConflict,
      );
    }
    const stored = fromStoredPayload(row.responsePayload);
    if (!stored) {
      throw new BookingDomainError(
        "IDEMPOTENCY_CONFLICT",
        BOOKING_SAFE_MESSAGES.idempotencyConflict,
      );
    }
    return stored;
  }
  if (row.requestFingerprint !== input.fingerprint) {
    throw new BookingDomainError(
      "IDEMPOTENCY_CONFLICT",
      BOOKING_SAFE_MESSAGES.idempotencyConflict,
    );
  }
  return "claimed";
}

async function completeIdempotency(
  db: AppointmentQueryDb,
  input: {
    userId: string;
    keyHash: string;
    result: StoredBookingPayload;
  },
): Promise<void> {
  await db
    .update(bookingIdempotency)
    .set({
      status: "COMPLETED",
      responsePublicId: input.result.ok ? input.result.appointment.publicId : null,
      responsePayload: toStoredPayload(input.result),
    })
    .where(
      and(
        eq(bookingIdempotency.userId, input.userId),
        eq(bookingIdempotency.operation, BOOKING_OPERATION),
        eq(bookingIdempotency.keyHash, input.keyHash),
      ),
    );
}

function slotMismatchError(startsAt: Date, now: Date): BookingDomainError {
  if (startsAt.getTime() <= now.getTime()) {
    return new BookingDomainError(
      "IN_THE_PAST",
      BOOKING_SAFE_MESSAGES.inThePast,
    );
  }
  return new BookingDomainError(
    "OUTSIDE_AVAILABILITY",
    BOOKING_SAFE_MESSAGES.outsideAvailability,
  );
}

async function insertAppointmentWithPublicId(
  db: AppointmentQueryDb,
  values: Omit<typeof appointments.$inferInsert, "publicId">,
): Promise<{ id: string; publicId: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicId = generatePublicId("APT");
    try {
      await db.insert(appointments).values({ ...values, publicId });
      return { id: values.id, publicId };
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new BookingDomainError(
          "SLOT_UNAVAILABLE",
          BOOKING_SAFE_MESSAGES.slotUnavailable,
        );
      }
      if (postgresErrorCode(error) === "23505" && attempt < 4) {
        continue;
      }
      throw error;
    }
  }
  throw new BookingDomainError(
    "NOT_CONFIGURED",
    BOOKING_SAFE_MESSAGES.outsideAvailability,
  );
}

async function executeBooking(
  ctx: IdentityContext,
  db: AppointmentQueryDb,
  input: {
    patient: BookablePatient;
    appointmentTypePublicId: string;
    startsAt: Date;
    keyHash: string;
    fingerprint: string;
    hooks?: BookingTransactionHooks;
  },
): Promise<BookingResult> {
  await loadBookablePatient(ctx, db, input.patient.principal);
  const appointmentType = await resolveAppointmentType(
    db,
    input.appointmentTypePublicId,
  );
  await lockPsychologist(db, appointmentType.psychologistUserId);

  const claimed = await claimIdempotency(ctx, db, {
    userId: input.patient.userId,
    keyHash: input.keyHash,
    fingerprint: input.fingerprint,
  });
  if (claimed !== "claimed") {
    if (claimed.ok) {
      return { ...claimed, replayed: true };
    }
    return claimed;
  }

  const dateLocal = formatLocalDate(input.startsAt, PRACTICE_TIMEZONE);
  let loaded;
  try {
    loaded = await availabilityService.loadSlotContext(db, ctx.now(), {
      appointmentTypePublicId: input.appointmentTypePublicId,
      dateLocal,
    });
  } catch (error) {
    const failure = safeBookingFailure(error);
    const mapped: BookingFailure = {
      ok: false,
      code:
        failure.code === "NOT_CONFIGURED" || failure.code === "VALIDATION"
          ? "TYPE_UNAVAILABLE"
          : failure.code,
      message:
        failure.code === "NOT_CONFIGURED" || failure.code === "VALIDATION"
          ? BOOKING_SAFE_MESSAGES.typeUnavailable
          : failure.message,
    };
    await completeIdempotency(db, {
      userId: input.patient.userId,
      keyHash: input.keyHash,
      result: mapped,
    });
    return mapped;
  }

  if (!loaded.appointmentType.active) {
    const mapped: BookingFailure = {
      ok: false,
      code: "TYPE_UNAVAILABLE",
      message: BOOKING_SAFE_MESSAGES.typeUnavailable,
    };
    await completeIdempotency(db, {
      userId: input.patient.userId,
      keyHash: input.keyHash,
      result: mapped,
    });
    return mapped;
  }

  const structural = availabilityService.isExactSlot(
    { ...loaded.slotsInput, blockingOccupied: [] },
    input.startsAt,
  );
  if (!structural) {
    const mismatch = slotMismatchError(input.startsAt, loaded.slotsInput.now);
    const mapped: BookingFailure = {
      ok: false,
      code: mismatch.code,
      message: mismatch.message,
    };
    await completeIdempotency(db, {
      userId: input.patient.userId,
      keyHash: input.keyHash,
      result: mapped,
    });
    return mapped;
  }

  const occupiedByLoaded = loaded.slotsInput.blockingOccupied.some((range) =>
    intervalsOverlap(
      { start: structural.occupiedStartsAt, end: structural.occupiedEndsAt },
      range,
    ),
  );
  const occupiedByQuery = await hasBlockingOccupiedOverlap(
    db,
    loaded.appointmentType.psychologistUserId,
    structural.occupiedStartsAt,
    structural.occupiedEndsAt,
  );
  if (occupiedByLoaded || occupiedByQuery) {
    const mapped: BookingFailure = {
      ok: false,
      code: "SLOT_UNAVAILABLE",
      message: BOOKING_SAFE_MESSAGES.slotUnavailable,
    };
    await completeIdempotency(db, {
      userId: input.patient.userId,
      keyHash: input.keyHash,
      result: mapped,
    });
    return mapped;
  }

  const now = ctx.now();
  const appointmentId = generateUuid();
  let inserted: { id: string; publicId: string };
  try {
    inserted = await insertAppointmentWithPublicId(db, {
      id: appointmentId,
      patientUserId: input.patient.userId,
      psychologistUserId: loaded.appointmentType.psychologistUserId,
      appointmentTypeId: loaded.appointmentType.id,
      status: "PENDING",
      startsAt: structural.startsAt,
      endsAt: structural.endsAt,
      occupiedStartsAt: structural.occupiedStartsAt,
      occupiedEndsAt: structural.occupiedEndsAt,
      requestedStartsAt: structural.startsAt,
      requestedEndsAt: structural.endsAt,
      timezone: PRACTICE_TIMEZONE,
      version: 1,
      proposedStartsAt: null,
      proposedEndsAt: null,
      cancelReasonCode: null,
      cancelNote: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isOccupancyContention(error) || isBookingDomainErrorSafe(error)) {
      const mapped: BookingFailure = {
        ok: false,
        code: "SLOT_UNAVAILABLE",
        message: BOOKING_SAFE_MESSAGES.slotUnavailable,
      };
      await completeIdempotency(db, {
        userId: input.patient.userId,
        keyHash: input.keyHash,
        result: mapped,
      });
      return mapped;
    }
    throw error;
  }

  await input.hooks?.afterAppointmentInsert?.();

  const historyMetadata = {
    appointmentPublicId: inserted.publicId,
    appointmentTypePublicId: loaded.appointmentType.publicId,
  };
  await db.insert(appointmentHistory).values([
    {
      id: generateUuid(),
      appointmentId: inserted.id,
      eventType: "CREATED",
      fromStatus: null,
      toStatus: "REQUESTED",
      actorUserId: input.patient.userId,
      actorRole: "PATIENT",
      metadata: historyMetadata,
      createdAt: now,
    },
    {
      id: generateUuid(),
      appointmentId: inserted.id,
      eventType: "REQUESTED",
      fromStatus: "REQUESTED",
      toStatus: "PENDING",
      actorUserId: input.patient.userId,
      actorRole: "PATIENT",
      metadata: historyMetadata,
      createdAt: now,
    },
  ]);
  await input.hooks?.afterHistoryInsert?.();

  await db.insert(appointmentNotificationOutbox).values({
    id: generateUuid(),
    eventId: generateUuid(),
    eventKey: "AppointmentRequested",
    appointmentId: inserted.id,
    payloadNonSensitive: {
      appointmentPublicId: inserted.publicId,
      appointmentTypePublicId: loaded.appointmentType.publicId,
      startsAt: structural.startsAt.toISOString(),
      endsAt: structural.endsAt.toISOString(),
      timezone: PRACTICE_TIMEZONE,
      status: "PENDING",
    },
    status: "PENDING",
    attemptCount: 0,
    nextAttemptAt: null,
    createdAt: now,
  });
  await input.hooks?.afterOutboxInsert?.();

  await appendAuditLog(ctx, {
    actorUserId: input.patient.userId,
    action: "APPOINTMENT_REQUESTED",
    targetType: "appointment",
    targetId: inserted.publicId,
    result: "SUCCESS",
    metadata: {
      appointmentPublicId: inserted.publicId,
      appointmentTypePublicId: loaded.appointmentType.publicId,
      status: "PENDING",
    },
    db: asIdentityDb(db),
  });

  const success: BookingSuccess = {
    ok: true,
    message: BOOKING_SAFE_MESSAGES.recorded,
    appointment: {
      publicId: inserted.publicId,
      appointmentType: {
        publicId: loaded.appointmentType.publicId,
        name: loaded.appointmentType.name,
        durationMinutes: loaded.appointmentType.durationMinutes,
      },
      date: dateLocal,
      start: structural.startsAt.toISOString(),
      end: structural.endsAt.toISOString(),
      timezone: PRACTICE_TIMEZONE,
      status: "PENDING",
    },
  };
  await completeIdempotency(db, {
    userId: input.patient.userId,
    keyHash: input.keyHash,
    result: success,
  });
  return success;
}

function isBookingDomainErrorSafe(error: unknown): boolean {
  return error instanceof BookingDomainError;
}

/**
 * Authenticated patient booking. AvailabilityService is advisory preflight
 * only. PostgreSQL transaction + occupied-range exclusion constraint remain
 * the authority for slot contention.
 *
 * Consultation end = start + appointment type duration (not including buffers).
 * Occupied range = consultation ± buffers and is what the exclusion constraint
 * uses.
 */
export async function requestAppointment(
  ctx: IdentityContext,
  input: AppointmentBookingInput,
): Promise<BookingResult> {
  if (!ctx.config.sessionSecret) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: BOOKING_SAFE_MESSAGES.outsideAvailability,
    };
  }
  const authorized = await authorizeBookablePatient(ctx, input.principal);
  if (!authorized.ok) {
    if (authorized.code === "UNAUTHENTICATED" || authorized.code === "FORBIDDEN") {
      await appendAuditLog(ctx, {
        actorUserId: input.principal?.userId ?? null,
        action: "APPOINTMENT_REQUESTED",
        targetType: "appointment",
        result: "DENIED",
        metadata: { reason: authorized.code },
      });
    }
    return authorized;
  }

  const allowed = await consumeBookingRateLimits(ctx, {
    userId: authorized.patient.userId,
    ipAddress: input.ipAddress,
  });
  if (!allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: BOOKING_SAFE_MESSAGES.rateLimited,
    };
  }

  try {
    const startsAt = parseRequestedStart(input.requestedStart);
    const idempotencyKey = resolveIdempotencyKey(input.idempotencyKey);
    const keyHash = idempotencyKeyHash(
      ctx,
      authorized.patient.userId,
      idempotencyKey,
    );
    const fingerprint = requestFingerprint(
      ctx,
      input.appointmentTypePublicId,
      startsAt,
    );
    return await ctx.db.transaction(async (tx) =>
      executeBooking(ctx, asQueryDb(tx), {
        patient: authorized.patient,
        appointmentTypePublicId: input.appointmentTypePublicId,
        startsAt,
        keyHash,
        fingerprint,
        hooks: input.hooks,
      }),
    );
  } catch (error) {
    if (isOccupancyContention(error)) {
      logStructured("WARNING", {
        operation: "appointment_booking",
        errorType: "exclusion_conflict",
      });
    } else if (
      !(error instanceof BookingDomainError) &&
      !(error instanceof Error && error.name === "AppointmentDomainError")
    ) {
      logStructured("ERROR", {
        operation: "appointment_booking",
        errorType: "unexpected",
      });
    }
    return safeBookingFailure(error);
  }
}

export async function listBookableAppointmentTypes(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
): Promise<
  | { ok: true; appointmentTypes: BookableAppointmentTypeView[] }
  | BookingFailure
> {
  const authorized = await authorizeBookablePatient(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const rows = await ctx.db
    .select({
      publicId: appointmentTypes.publicId,
      name: appointmentTypes.name,
      durationMinutes: appointmentTypes.durationMinutes,
    })
    .from(appointmentTypes)
    .where(eq(appointmentTypes.active, true));
  return {
    ok: true,
    appointmentTypes: rows.map((row) => ({
      publicId: row.publicId,
      name: row.name,
      durationMinutes: row.durationMinutes,
    })),
  };
}
