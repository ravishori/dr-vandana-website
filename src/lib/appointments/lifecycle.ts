import { and, eq, sql } from "drizzle-orm";

import { availabilityService, intervalsOverlap } from "@/lib/appointments/availability";
import {
  APPOINTMENT_RATE_LIMITS,
  LIFECYCLE_SAFE_MESSAGES,
  OPERATIONAL_CANCEL_REASON_CODES,
  PRACTICE_TIMEZONE,
  PUBLIC_APPOINTMENT_ID_PATTERN,
  type AppointmentStatus,
  type OperationalCancelReasonCode,
  type OutboxEventKey,
} from "@/lib/appointments/constants";
import type { AppointmentQueryDb } from "@/lib/appointments/db-types";
import {
  AppointmentDomainError,
  LifecycleDomainError,
  isExclusionViolation,
  isOccupancyContention,
  safeLifecycleFailure,
  type LifecycleErrorCode,
} from "@/lib/appointments/errors";
import { lockPsychologistCalendar } from "@/lib/appointments/lock";
import { hasBlockingOccupiedOverlap } from "@/lib/appointments/occupancy";
import {
  appointmentHistory,
  appointmentNotificationOutbox,
  appointmentTypes,
  appointments,
  practiceAppointmentSettings,
} from "@/lib/appointments/schema";
import {
  appointmentStateMachine,
  type AppointmentAction,
  type AppointmentActorRole,
} from "@/lib/appointments/state-machine";
import { formatLocalDate } from "@/lib/appointments/timezone";
import { appendAuditLog } from "@/lib/identity/audit";
import {
  authorizationService,
  type AuthorizationPrincipal,
} from "@/lib/identity/authorization";
import type { IdentityContext } from "@/lib/identity/context";
import { generateUuid } from "@/lib/identity/crypto";
import type { IdentityDb } from "@/lib/identity/db";
import { users } from "@/lib/identity/schema";
import { logStructured } from "@/lib/observability/logger";

export type LifecycleTransactionHooks = {
  afterAppointmentUpdate?: () => Promise<void> | void;
  afterHistoryInsert?: () => Promise<void> | void;
  afterOutboxInsert?: () => Promise<void> | void;
  afterAuditInsert?: () => Promise<void> | void;
};

export type LifecycleFailure = {
  ok: false;
  code: LifecycleErrorCode;
  message: string;
};

export type LifecycleSuccess = {
  ok: true;
  publicId: string;
  status: AppointmentStatus;
  version: number;
  message: string;
  start?: string;
  end?: string;
};

export type LifecycleResult = LifecycleSuccess | LifecycleFailure;

export type LifecycleMutationInput = {
  principal: AuthorizationPrincipal | null;
  ipAddress?: string | null;
  publicId: string;
  expectedVersion?: number;
  reasonCode?: string | null;
  reasonNote?: string | null;
  hooks?: LifecycleTransactionHooks;
};

type LoadedAppointment = typeof appointments.$inferSelect;

function asQueryDb(db: IdentityDb | AppointmentQueryDb): AppointmentQueryDb {
  return db;
}

function asIdentityDb(db: AppointmentQueryDb): IdentityDb {
  return db as IdentityDb;
}

function actorRoleOf(
  principal: AuthorizationPrincipal,
): AppointmentActorRole | null {
  if (principal.roles.includes("PSYCHOLOGIST")) {
    return "PSYCHOLOGIST";
  }
  if (principal.roles.includes("PATIENT")) {
    return "PATIENT";
  }
  if (principal.roles.includes("SUPER_ADMIN")) {
    return "SUPER_ADMIN";
  }
  if (principal.roles.includes("STAFF")) {
    return "STAFF";
  }
  return null;
}

async function assertActiveUser(
  db: AppointmentQueryDb,
  userId: string,
): Promise<void> {
  const [user] = await db
    .select({
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      mobileVerifiedAt: users.mobileVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.status !== "ACTIVE") {
    throw new LifecycleDomainError("FORBIDDEN", LIFECYCLE_SAFE_MESSAGES.forbidden);
  }
}

async function assertVerifiedPatient(
  db: AppointmentQueryDb,
  userId: string,
): Promise<void> {
  const [user] = await db
    .select({
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      mobileVerifiedAt: users.mobileVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    !user.mobileVerifiedAt
  ) {
    throw new LifecycleDomainError("FORBIDDEN", LIFECYCLE_SAFE_MESSAGES.forbidden);
  }
}

export async function authorizePracticePsychologist(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
): Promise<
  | { ok: true; principal: AuthorizationPrincipal }
  | LifecycleFailure
> {
  const access = authorizationService.canAccess(principal, {
    roles: ["PSYCHOLOGIST"],
    permission: "MANAGE_APPOINTMENT_SETTINGS",
  });
  if (!access.allowed) {
    if (!principal || access.reason === "unauthenticated") {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: LIFECYCLE_SAFE_MESSAGES.unauthenticated,
      };
    }
    return {
      ok: false,
      code: "FORBIDDEN",
      message: LIFECYCLE_SAFE_MESSAGES.forbidden,
    };
  }
  if (!principal) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: LIFECYCLE_SAFE_MESSAGES.unauthenticated,
    };
  }
  try {
    await assertActiveUser(ctx.db, principal.userId);
    return { ok: true, principal };
  } catch (error) {
    return safeLifecycleFailure(error);
  }
}

async function consumeLifecycleLimit(
  ctx: IdentityContext,
  userId: string,
  ipAddress?: string | null,
): Promise<boolean> {
  const ip = ipAddress?.trim() || "unknown";
  const ipLimit = await ctx.rateLimit.consume(
    `appointment-lifecycle-ip:${ip}`,
    APPOINTMENT_RATE_LIMITS.lifecycle.max,
    APPOINTMENT_RATE_LIMITS.lifecycle.windowMs,
  );
  const userLimit = await ctx.rateLimit.consume(
    `appointment-lifecycle-user:${userId}`,
    APPOINTMENT_RATE_LIMITS.lifecycle.max,
    APPOINTMENT_RATE_LIMITS.lifecycle.windowMs,
  );
  return ipLimit.allowed && userLimit.allowed;
}

function parsePublicId(publicId: string): string {
  if (!PUBLIC_APPOINTMENT_ID_PATTERN.test(publicId)) {
    throw new LifecycleDomainError("NOT_FOUND", LIFECYCLE_SAFE_MESSAGES.notFound);
  }
  return publicId;
}

async function loadAppointmentForUpdate(
  db: AppointmentQueryDb,
  publicId: string,
  owner?: { patientUserId: string } | { psychologistUserId: string },
): Promise<LoadedAppointment> {
  if (owner && "patientUserId" in owner) {
    await db.execute(
      sql`select id from appointments where public_id = ${publicId} and patient_user_id = ${owner.patientUserId} for update`,
    );
    const [row] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.publicId, publicId),
          eq(appointments.patientUserId, owner.patientUserId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new LifecycleDomainError(
        "NOT_FOUND",
        LIFECYCLE_SAFE_MESSAGES.inaccessible,
      );
    }
    return row;
  }
  if (owner && "psychologistUserId" in owner) {
    await db.execute(
      sql`select id from appointments where public_id = ${publicId} and psychologist_user_id = ${owner.psychologistUserId} for update`,
    );
    const [row] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.publicId, publicId),
          eq(appointments.psychologistUserId, owner.psychologistUserId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new LifecycleDomainError("NOT_FOUND", LIFECYCLE_SAFE_MESSAGES.notFound);
    }
    return row;
  }
  await db.execute(
    sql`select id from appointments where public_id = ${publicId} for update`,
  );
  const [row] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.publicId, publicId))
    .limit(1);
  if (!row) {
    throw new LifecycleDomainError("NOT_FOUND", LIFECYCLE_SAFE_MESSAGES.notFound);
  }
  return row;
}

async function lockOwnedCalendarThenLoad(
  db: AppointmentQueryDb,
  publicId: string,
  owner: { patientUserId: string } | { psychologistUserId: string },
): Promise<LoadedAppointment> {
  const ownerFilter =
    "patientUserId" in owner
      ? and(
          eq(appointments.publicId, publicId),
          eq(appointments.patientUserId, owner.patientUserId),
        )
      : and(
          eq(appointments.publicId, publicId),
          eq(appointments.psychologistUserId, owner.psychologistUserId),
        );
  const [peek] = await db
    .select({ psychologistUserId: appointments.psychologistUserId })
    .from(appointments)
    .where(ownerFilter)
    .limit(1);
  if (!peek) {
    if ("patientUserId" in owner) {
      throw new LifecycleDomainError(
        "NOT_FOUND",
        LIFECYCLE_SAFE_MESSAGES.inaccessible,
      );
    }
    throw new LifecycleDomainError("NOT_FOUND", LIFECYCLE_SAFE_MESSAGES.notFound);
  }
  await lockPsychologistCalendar(db, peek.psychologistUserId);
  return loadAppointmentForUpdate(db, publicId, owner);
}

function assertOwnership(
  appointment: LoadedAppointment,
  principal: AuthorizationPrincipal,
  actor: AppointmentActorRole,
): void {
  if (actor === "PSYCHOLOGIST" && appointment.psychologistUserId === principal.userId) {
    return;
  }
  if (actor === "PATIENT" && appointment.patientUserId === principal.userId) {
    return;
  }
  throw new LifecycleDomainError("FORBIDDEN", LIFECYCLE_SAFE_MESSAGES.forbidden);
}

function transitionFailure(
  status: AppointmentStatus,
  action: AppointmentAction,
): LifecycleDomainError {
  if (action === "CONFIRM" && status === "CONFIRMED") {
    return new LifecycleDomainError(
      "ALREADY_CONFIRMED",
      LIFECYCLE_SAFE_MESSAGES.alreadyConfirmed,
    );
  }
  if (
    action === "CONFIRM" &&
    (status === "CANCELLED" || status === "REJECTED" || status === "COMPLETED" || status === "NO_SHOW")
  ) {
    return new LifecycleDomainError(
      "NOT_FOUND",
      LIFECYCLE_SAFE_MESSAGES.noLongerAvailable,
    );
  }
  return new LifecycleDomainError(
    "INVALID_TRANSITION",
    LIFECYCLE_SAFE_MESSAGES.invalidTransition,
  );
}

function sanitizeOperationalNote(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().slice(0, 200);
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeReasonCode(
  value: string | null | undefined,
): OperationalCancelReasonCode | null {
  if (!value) {
    return null;
  }
  return (OPERATIONAL_CANCEL_REASON_CODES as readonly string[]).includes(value)
    ? (value as OperationalCancelReasonCode)
    : null;
}

async function insertLifecycleSideEffects(
  ctx: IdentityContext,
  db: AppointmentQueryDb,
  input: {
    appointment: LoadedAppointment;
    actorUserId: string;
    actorRole: AppointmentActorRole;
    action: AppointmentAction;
    fromStatus: AppointmentStatus;
    toStatus: AppointmentStatus;
    historyEvent: string;
    auditAction: string;
    outboxKey: OutboxEventKey;
    metadata: Record<string, unknown>;
    hooks?: LifecycleTransactionHooks;
  },
): Promise<void> {
  const now = ctx.now();
  await db.insert(appointmentHistory).values({
    id: generateUuid(),
    appointmentId: input.appointment.id,
    eventType: input.historyEvent,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    metadata: input.metadata,
    createdAt: now,
  });
  await input.hooks?.afterHistoryInsert?.();
  await db.insert(appointmentNotificationOutbox).values({
    id: generateUuid(),
    eventId: generateUuid(),
    eventKey: input.outboxKey,
    appointmentId: input.appointment.id,
    payloadNonSensitive: {
      appointmentPublicId: input.appointment.publicId,
      status: input.toStatus,
      startsAt: input.appointment.startsAt.toISOString(),
      endsAt: input.appointment.endsAt.toISOString(),
      timezone: PRACTICE_TIMEZONE,
      ...(input.appointment.proposedStartsAt
        ? { proposedStartsAt: input.appointment.proposedStartsAt.toISOString() }
        : {}),
    },
    status: "PENDING",
    attemptCount: 0,
    nextAttemptAt: null,
    createdAt: now,
  });
  await input.hooks?.afterOutboxInsert?.();
  await appendAuditLog(ctx, {
    actorUserId: input.actorUserId,
    action: input.auditAction,
    targetType: "appointment",
    targetId: input.appointment.publicId,
    result: "SUCCESS",
    metadata: input.metadata,
    db: asIdentityDb(db),
  });
  await input.hooks?.afterAuditInsert?.();
}

async function casUpdateAppointment(
  db: AppointmentQueryDb,
  appointment: LoadedAppointment,
  values: Partial<typeof appointments.$inferInsert> & { status: string; version: number },
): Promise<void> {
  const updated = await db
    .update(appointments)
    .set(values)
    .where(
      and(
        eq(appointments.id, appointment.id),
        eq(appointments.version, appointment.version),
        eq(appointments.status, appointment.status),
      ),
    )
    .returning({ id: appointments.id });
  if (updated.length === 0) {
    throw new LifecycleDomainError("STALE", LIFECYCLE_SAFE_MESSAGES.stale);
  }
}

function assertExpectedVersion(
  appointment: LoadedAppointment,
  expectedVersion?: number,
): void {
  if (expectedVersion !== undefined && expectedVersion !== appointment.version) {
    throw new LifecycleDomainError("STALE", LIFECYCLE_SAFE_MESSAGES.stale);
  }
}

async function authorizeMutationActor(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  action: AppointmentAction,
): Promise<{ principal: AuthorizationPrincipal; actor: AppointmentActorRole }> {
  if (!principal) {
    throw new LifecycleDomainError(
      "UNAUTHENTICATED",
      LIFECYCLE_SAFE_MESSAGES.unauthenticated,
    );
  }
  const actor = actorRoleOf(principal);
  if (!actor) {
    throw new LifecycleDomainError("FORBIDDEN", LIFECYCLE_SAFE_MESSAGES.forbidden);
  }
  const patientAction =
    actor === "PATIENT" &&
    (action === "CANCEL" || action === "REQUEST_RESCHEDULE");
  if (patientAction) {
    const access = authorizationService.canAccess(principal, { roles: ["PATIENT"] });
    if (!access.allowed) {
      throw new LifecycleDomainError("FORBIDDEN", LIFECYCLE_SAFE_MESSAGES.forbidden);
    }
    await assertVerifiedPatient(ctx.db, principal.userId);
  } else {
    const access = authorizationService.canAccess(principal, {
      roles: ["PSYCHOLOGIST"],
      permission: "MANAGE_APPOINTMENT_SETTINGS",
    });
    if (!access.allowed) {
      if (access.reason === "unauthenticated") {
        throw new LifecycleDomainError(
          "UNAUTHENTICATED",
          LIFECYCLE_SAFE_MESSAGES.unauthenticated,
        );
      }
      throw new LifecycleDomainError("FORBIDDEN", LIFECYCLE_SAFE_MESSAGES.forbidden);
    }
  }
  await assertActiveUser(ctx.db, principal.userId);
  return { principal, actor };
}

async function runMutation(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
  action: AppointmentAction,
  execute: (
    db: AppointmentQueryDb,
    actor: AppointmentActorRole,
    principal: AuthorizationPrincipal,
  ) => Promise<LifecycleSuccess>,
): Promise<LifecycleResult> {
  try {
    const authorized = await authorizeMutationActor(ctx, input.principal, action);
    const allowed = await consumeLifecycleLimit(
      ctx,
      authorized.principal.userId,
      input.ipAddress,
    );
    if (!allowed) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: LIFECYCLE_SAFE_MESSAGES.rateLimited,
      };
    }
    parsePublicId(input.publicId);
    return await ctx.db.transaction(async (tx) =>
      execute(asQueryDb(tx), authorized.actor, authorized.principal),
    );
  } catch (error) {
    if (isOccupancyContention(error)) {
      logStructured("WARNING", {
        operation: "appointment_lifecycle",
        errorType: "exclusion_conflict",
      });
    } else if (
      !(error instanceof LifecycleDomainError) &&
      !(error instanceof AppointmentDomainError)
    ) {
      logStructured("ERROR", {
        operation: "appointment_lifecycle",
        errorType: "unexpected",
      });
    }
    if (
      error instanceof LifecycleDomainError &&
      (error.code === "UNAUTHENTICATED" || error.code === "FORBIDDEN")
    ) {
      await appendAuditLog(ctx, {
        actorUserId: input.principal?.userId ?? null,
        action: "APPOINTMENT_LIFECYCLE_DENIED",
        targetType: "appointment",
        targetId: input.publicId,
        result: "DENIED",
        metadata: { reason: error.code, action },
      });
    }
    return safeLifecycleFailure(error);
  }
}

async function applyStatusTransition(
  ctx: IdentityContext,
  db: AppointmentQueryDb,
  input: LifecycleMutationInput,
  actor: AppointmentActorRole,
  principal: AuthorizationPrincipal,
  action: AppointmentAction,
  successMessage: string,
  auditAction: string,
  outboxKey: OutboxEventKey,
  extra?: {
    cancelReasonCode?: string | null;
    cancelNote?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<LifecycleSuccess> {
  const appointment = await loadAppointmentForUpdate(
    db,
    input.publicId,
    actor === "PATIENT"
      ? { patientUserId: principal.userId }
      : { psychologistUserId: principal.userId },
  );
  assertOwnership(appointment, principal, actor);
  assertExpectedVersion(appointment, input.expectedVersion);
  let rule;
  try {
    rule = appointmentStateMachine.resolve(
      appointment.status as AppointmentStatus,
      action,
      actor,
    );
  } catch {
    throw transitionFailure(appointment.status as AppointmentStatus, action);
  }
  const now = ctx.now();
  const nextVersion = appointment.version + 1;
  await casUpdateAppointment(db, appointment, {
    status: rule.to,
    version: nextVersion,
    cancelReasonCode: extra?.cancelReasonCode ?? appointment.cancelReasonCode,
    cancelNote: extra?.cancelNote ?? appointment.cancelNote,
    updatedAt: now,
  });
  await input.hooks?.afterAppointmentUpdate?.();
  const updated = { ...appointment, status: rule.to, version: nextVersion };
  await insertLifecycleSideEffects(ctx, db, {
    appointment: updated,
    actorUserId: principal.userId,
    actorRole: actor,
    action,
    fromStatus: appointment.status as AppointmentStatus,
    toStatus: rule.to,
    historyEvent: rule.historyEvent,
    auditAction,
    outboxKey,
    metadata: {
      appointmentPublicId: appointment.publicId,
      fromStatus: appointment.status,
      toStatus: rule.to,
      ...(extra?.metadata ?? {}),
    },
    hooks: input.hooks,
  });
  return {
    ok: true,
    publicId: appointment.publicId,
    status: rule.to,
    version: nextVersion,
    message: successMessage,
    start: appointment.startsAt.toISOString(),
    end: appointment.endsAt.toISOString(),
  };
}

async function assertSlotStillValid(
  ctx: IdentityContext,
  db: AppointmentQueryDb,
  appointment: LoadedAppointment,
): Promise<void> {
  const dateLocal = formatLocalDate(appointment.startsAt, PRACTICE_TIMEZONE);
  const [appointmentType] = await db
    .select()
    .from(appointmentTypes)
    .where(eq(appointmentTypes.id, appointment.appointmentTypeId))
    .limit(1);
  if (!appointmentType) {
    throw new LifecycleDomainError(
      "NOT_FOUND",
      LIFECYCLE_SAFE_MESSAGES.noLongerAvailable,
    );
  }
  let loaded;
  try {
    loaded = await availabilityService.loadSlotContext(db, ctx.now(), {
      appointmentTypePublicId: appointmentType.publicId,
      dateLocal,
      excludeAppointmentId: appointment.id,
    });
  } catch {
    loaded = null;
  }
  const structural = loaded
    ? availabilityService.isExactSlot(
        { ...loaded.slotsInput, blockingOccupied: [] },
        appointment.startsAt,
      )
    : null;
  if (!structural) {
    throw new LifecycleDomainError(
      "NOT_FOUND",
      LIFECYCLE_SAFE_MESSAGES.noLongerAvailable,
    );
  }
  const occupied = await hasBlockingOccupiedOverlap(
    db,
    appointment.psychologistUserId,
    appointment.occupiedStartsAt,
    appointment.occupiedEndsAt,
    appointment.id,
  );
  if (occupied) {
    throw new LifecycleDomainError(
      "SLOT_UNAVAILABLE",
      LIFECYCLE_SAFE_MESSAGES.noLongerAvailable,
    );
  }
}

export async function confirmAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "CONFIRM", async (db, actor, principal) => {
    const appointment = await loadAppointmentForUpdate(db, input.publicId, {
      psychologistUserId: principal.userId,
    });
    assertOwnership(appointment, principal, actor);
    assertExpectedVersion(appointment, input.expectedVersion);
    await assertSlotStillValid(ctx, db, appointment);
    return applyStatusTransition(
      ctx,
      db,
      input,
      actor,
      principal,
      "CONFIRM",
      LIFECYCLE_SAFE_MESSAGES.confirmed,
      "APPOINTMENT_CONFIRMED",
      "AppointmentConfirmed",
    );
  });
}

export async function rejectAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "REJECT", async (db, actor, principal) =>
    applyStatusTransition(
      ctx,
      db,
      input,
      actor,
      principal,
      "REJECT",
      LIFECYCLE_SAFE_MESSAGES.rejected,
      "APPOINTMENT_REJECTED",
      "AppointmentRejected",
      {
        metadata: {
          reasonCode: sanitizeReasonCode(input.reasonCode),
          reason: sanitizeOperationalNote(input.reasonNote),
        },
      },
    ),
  );
}

async function assertCancellationPolicy(
  db: AppointmentQueryDb,
  appointment: LoadedAppointment,
  actor: AppointmentActorRole,
  now: Date,
): Promise<void> {
  if (actor !== "PATIENT") {
    return;
  }
  const [settings] = await db
    .select({
      cancellationMinimumNoticeMinutes:
        practiceAppointmentSettings.cancellationMinimumNoticeMinutes,
    })
    .from(practiceAppointmentSettings)
    .where(
      eq(
        practiceAppointmentSettings.psychologistUserId,
        appointment.psychologistUserId,
      ),
    )
    .limit(1);
  const notice = settings?.cancellationMinimumNoticeMinutes;
  if (notice === null || notice === undefined) {
    return;
  }
  const earliest = new Date(now.getTime() + notice * 60_000);
  if (appointment.startsAt.getTime() < earliest.getTime()) {
    throw new LifecycleDomainError(
      "POLICY",
      LIFECYCLE_SAFE_MESSAGES.cancellationNotAllowed,
    );
  }
}

export async function cancelAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "CANCEL", async (db, actor, principal) => {
    const appointment = await loadAppointmentForUpdate(
      db,
      input.publicId,
      actor === "PATIENT"
        ? { patientUserId: principal.userId }
        : { psychologistUserId: principal.userId },
    );
    assertOwnership(appointment, principal, actor);
    assertExpectedVersion(appointment, input.expectedVersion);
    await assertCancellationPolicy(db, appointment, actor, ctx.now());
    return applyStatusTransition(
      ctx,
      db,
      {
        ...input,
      },
      actor,
      principal,
      "CANCEL",
      actor === "PATIENT"
        ? LIFECYCLE_SAFE_MESSAGES.cancelledByPatient
        : LIFECYCLE_SAFE_MESSAGES.cancelled,
      "APPOINTMENT_CANCELLED",
      "AppointmentCancelled",
      {
        cancelReasonCode: sanitizeReasonCode(input.reasonCode),
        cancelNote: sanitizeOperationalNote(input.reasonNote),
        metadata: {
          cancelledBy: actor,
          reasonCode: sanitizeReasonCode(input.reasonCode),
          reason: sanitizeOperationalNote(input.reasonNote),
        },
      },
    );
  });
}

export async function completeAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "COMPLETE", async (db, actor, principal) =>
    applyStatusTransition(
      ctx,
      db,
      input,
      actor,
      principal,
      "COMPLETE",
      LIFECYCLE_SAFE_MESSAGES.completed,
      "APPOINTMENT_COMPLETED",
      "AppointmentCompleted",
    ),
  );
}

export async function markAppointmentNoShow(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "NO_SHOW", async (db, actor, principal) =>
    applyStatusTransition(
      ctx,
      db,
      input,
      actor,
      principal,
      "NO_SHOW",
      LIFECYCLE_SAFE_MESSAGES.noShow,
      "APPOINTMENT_NO_SHOW",
      "AppointmentNoShow",
    ),
  );
}

async function validateRequestedSlot(
  ctx: IdentityContext,
  db: AppointmentQueryDb,
  appointment: LoadedAppointment,
  requestedStart: string,
) {
  const startsAt = new Date(requestedStart);
  if (Number.isNaN(startsAt.getTime())) {
    throw new LifecycleDomainError(
      "VALIDATION",
      LIFECYCLE_SAFE_MESSAGES.slotUnavailable,
    );
  }
  const [appointmentType] = await db
    .select()
    .from(appointmentTypes)
    .where(eq(appointmentTypes.id, appointment.appointmentTypeId))
    .limit(1);
  if (
    !appointmentType ||
    !appointmentType.active ||
    appointmentType.durationMinutes <= 0
  ) {
    throw new LifecycleDomainError(
      "SLOT_UNAVAILABLE",
      LIFECYCLE_SAFE_MESSAGES.slotUnavailable,
    );
  }
  const dateLocal = formatLocalDate(startsAt, PRACTICE_TIMEZONE);
  const loaded = await availabilityService.loadSlotContext(db, ctx.now(), {
    appointmentTypePublicId: appointmentType.publicId,
    dateLocal,
    excludeAppointmentId: appointment.id,
  });
  const structural = availabilityService.isExactSlot(
    { ...loaded.slotsInput, blockingOccupied: [] },
    startsAt,
  );
  if (!structural) {
    throw new LifecycleDomainError(
      "SLOT_UNAVAILABLE",
      LIFECYCLE_SAFE_MESSAGES.slotUnavailable,
    );
  }
  const occupiedByLoaded = loaded.slotsInput.blockingOccupied.some((range) =>
    intervalsOverlap(
      { start: structural.occupiedStartsAt, end: structural.occupiedEndsAt },
      range,
    ),
  );
  const occupiedByQuery = await hasBlockingOccupiedOverlap(
    db,
    appointment.psychologistUserId,
    structural.occupiedStartsAt,
    structural.occupiedEndsAt,
    appointment.id,
  );
  if (occupiedByLoaded || occupiedByQuery) {
    throw new LifecycleDomainError(
      "SLOT_UNAVAILABLE",
      LIFECYCLE_SAFE_MESSAGES.slotUnavailable,
    );
  }
  return structural;
}

export async function rescheduleAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput & { requestedStart: string },
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "RESCHEDULE", async (db, actor, principal) => {
    const appointment = await lockOwnedCalendarThenLoad(db, input.publicId, {
      psychologistUserId: principal.userId,
    });
    assertOwnership(appointment, principal, actor);
    assertExpectedVersion(appointment, input.expectedVersion);
    let rule;
    try {
      rule = appointmentStateMachine.resolve(
        appointment.status as AppointmentStatus,
        "RESCHEDULE",
        actor,
      );
    } catch {
      throw transitionFailure(appointment.status as AppointmentStatus, "RESCHEDULE");
    }

    const structural = await validateRequestedSlot(
      ctx,
      db,
      appointment,
      input.requestedStart,
    );

    const now = ctx.now();
    const nextVersion = appointment.version + 1;
    const oldStart = appointment.startsAt.toISOString();
    try {
      await casUpdateAppointment(db, appointment, {
        status: rule.to,
        version: nextVersion,
        startsAt: structural.startsAt,
        endsAt: structural.endsAt,
        occupiedStartsAt: structural.occupiedStartsAt,
        occupiedEndsAt: structural.occupiedEndsAt,
        proposedStartsAt: null,
        proposedEndsAt: null,
        updatedAt: now,
      });
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new LifecycleDomainError(
          "SLOT_UNAVAILABLE",
          LIFECYCLE_SAFE_MESSAGES.slotUnavailable,
        );
      }
      throw error;
    }
    await input.hooks?.afterAppointmentUpdate?.();
    const updated = {
      ...appointment,
      status: rule.to,
      version: nextVersion,
      startsAt: structural.startsAt,
      endsAt: structural.endsAt,
      occupiedStartsAt: structural.occupiedStartsAt,
      occupiedEndsAt: structural.occupiedEndsAt,
    };
    await insertLifecycleSideEffects(ctx, db, {
      appointment: updated,
      actorUserId: principal.userId,
      actorRole: actor,
      action: "RESCHEDULE",
      fromStatus: appointment.status as AppointmentStatus,
      toStatus: rule.to,
      historyEvent: rule.historyEvent,
      auditAction: "APPOINTMENT_RESCHEDULED",
      outboxKey: "AppointmentRescheduled",
      metadata: {
        appointmentPublicId: appointment.publicId,
        oldStart,
        newStart: structural.startsAt.toISOString(),
      },
      hooks: input.hooks,
    });
    return {
      ok: true,
      publicId: appointment.publicId,
      status: rule.to,
      version: nextVersion,
      message: LIFECYCLE_SAFE_MESSAGES.rescheduled,
      start: structural.startsAt.toISOString(),
      end: structural.endsAt.toISOString(),
    };
  });
}

export function psychologistActionsFor(
  status: AppointmentStatus,
): AppointmentAction[] {
  return appointmentStateMachine.availableActions(status, "PSYCHOLOGIST");
}

export function patientActionsFor(status: AppointmentStatus): AppointmentAction[] {
  return appointmentStateMachine
    .availableActions(status, "PATIENT")
    .filter((action) => action === "CANCEL" || action === "REQUEST_RESCHEDULE");
}

export async function requestRescheduleAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput & { requestedStart: string },
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "REQUEST_RESCHEDULE", async (db, actor, principal) => {
    const appointment = await lockOwnedCalendarThenLoad(db, input.publicId, {
      patientUserId: principal.userId,
    });
    assertOwnership(appointment, principal, actor);
    assertExpectedVersion(appointment, input.expectedVersion);
    let rule;
    try {
      rule = appointmentStateMachine.resolve(
        appointment.status as AppointmentStatus,
        "REQUEST_RESCHEDULE",
        actor,
      );
    } catch {
      throw transitionFailure(
        appointment.status as AppointmentStatus,
        "REQUEST_RESCHEDULE",
      );
    }

    const structural = await validateRequestedSlot(
      ctx,
      db,
      appointment,
      input.requestedStart,
    );
    const now = ctx.now();
    const nextVersion = appointment.version + 1;
    await casUpdateAppointment(db, appointment, {
      status: rule.to,
      version: nextVersion,
      proposedStartsAt: structural.startsAt,
      proposedEndsAt: structural.endsAt,
      updatedAt: now,
    });
    await input.hooks?.afterAppointmentUpdate?.();
    const updated = {
      ...appointment,
      status: rule.to,
      version: nextVersion,
      proposedStartsAt: structural.startsAt,
      proposedEndsAt: structural.endsAt,
    };
    await insertLifecycleSideEffects(ctx, db, {
      appointment: updated,
      actorUserId: principal.userId,
      actorRole: actor,
      action: "REQUEST_RESCHEDULE",
      fromStatus: appointment.status as AppointmentStatus,
      toStatus: rule.to,
      historyEvent: rule.historyEvent,
      auditAction: "APPOINTMENT_RESCHEDULE_REQUESTED",
      outboxKey: "AppointmentRescheduleRequested",
      metadata: {
        appointmentPublicId: appointment.publicId,
        currentStart: appointment.startsAt.toISOString(),
        proposedStart: structural.startsAt.toISOString(),
      },
      hooks: input.hooks,
    });
    return {
      ok: true,
      publicId: appointment.publicId,
      status: rule.to,
      version: nextVersion,
      message: LIFECYCLE_SAFE_MESSAGES.rescheduleRequested,
      start: appointment.startsAt.toISOString(),
      end: appointment.endsAt.toISOString(),
    };
  });
}

export async function acceptRescheduleAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "ACCEPT_RESCHEDULE", async (db, actor, principal) => {
    const appointment = await lockOwnedCalendarThenLoad(db, input.publicId, {
      psychologistUserId: principal.userId,
    });
    assertOwnership(appointment, principal, actor);
    assertExpectedVersion(appointment, input.expectedVersion);
    let rule;
    try {
      rule = appointmentStateMachine.resolve(
        appointment.status as AppointmentStatus,
        "ACCEPT_RESCHEDULE",
        actor,
      );
    } catch {
      throw transitionFailure(
        appointment.status as AppointmentStatus,
        "ACCEPT_RESCHEDULE",
      );
    }
    if (!appointment.proposedStartsAt) {
      throw new LifecycleDomainError(
        "NOT_FOUND",
        LIFECYCLE_SAFE_MESSAGES.noLongerAvailable,
      );
    }
    const structural = await validateRequestedSlot(
      ctx,
      db,
      appointment,
      appointment.proposedStartsAt.toISOString(),
    );
    const now = ctx.now();
    const nextVersion = appointment.version + 1;
    const oldStart = appointment.startsAt.toISOString();
    try {
      await casUpdateAppointment(db, appointment, {
        status: rule.to,
        version: nextVersion,
        startsAt: structural.startsAt,
        endsAt: structural.endsAt,
        occupiedStartsAt: structural.occupiedStartsAt,
        occupiedEndsAt: structural.occupiedEndsAt,
        proposedStartsAt: null,
        proposedEndsAt: null,
        updatedAt: now,
      });
    } catch (error) {
      if (isExclusionViolation(error)) {
        throw new LifecycleDomainError(
          "SLOT_UNAVAILABLE",
          LIFECYCLE_SAFE_MESSAGES.slotUnavailable,
        );
      }
      throw error;
    }
    await input.hooks?.afterAppointmentUpdate?.();
    const updated = {
      ...appointment,
      status: rule.to,
      version: nextVersion,
      startsAt: structural.startsAt,
      endsAt: structural.endsAt,
      occupiedStartsAt: structural.occupiedStartsAt,
      occupiedEndsAt: structural.occupiedEndsAt,
      proposedStartsAt: null,
      proposedEndsAt: null,
    };
    await insertLifecycleSideEffects(ctx, db, {
      appointment: updated,
      actorUserId: principal.userId,
      actorRole: actor,
      action: "ACCEPT_RESCHEDULE",
      fromStatus: appointment.status as AppointmentStatus,
      toStatus: rule.to,
      historyEvent: rule.historyEvent,
      auditAction: "APPOINTMENT_RESCHEDULED",
      outboxKey: "AppointmentRescheduled",
      metadata: {
        appointmentPublicId: appointment.publicId,
        oldStart,
        newStart: structural.startsAt.toISOString(),
      },
      hooks: input.hooks,
    });
    return {
      ok: true,
      publicId: appointment.publicId,
      status: rule.to,
      version: nextVersion,
      message: LIFECYCLE_SAFE_MESSAGES.rescheduled,
      start: structural.startsAt.toISOString(),
      end: structural.endsAt.toISOString(),
    };
  });
}

export async function declineRescheduleAppointment(
  ctx: IdentityContext,
  input: LifecycleMutationInput,
): Promise<LifecycleResult> {
  return runMutation(ctx, input, "DECLINE_RESCHEDULE", async (db, actor, principal) => {
    const appointment = await loadAppointmentForUpdate(db, input.publicId, {
      psychologistUserId: principal.userId,
    });
    assertOwnership(appointment, principal, actor);
    assertExpectedVersion(appointment, input.expectedVersion);
    let rule;
    try {
      rule = appointmentStateMachine.resolve(
        appointment.status as AppointmentStatus,
        "DECLINE_RESCHEDULE",
        actor,
      );
    } catch {
      throw transitionFailure(
        appointment.status as AppointmentStatus,
        "DECLINE_RESCHEDULE",
      );
    }
    const now = ctx.now();
    const nextVersion = appointment.version + 1;
    await casUpdateAppointment(db, appointment, {
      status: rule.to,
      version: nextVersion,
      proposedStartsAt: null,
      proposedEndsAt: null,
      updatedAt: now,
    });
    await input.hooks?.afterAppointmentUpdate?.();
    const updated = {
      ...appointment,
      status: rule.to,
      version: nextVersion,
      proposedStartsAt: null,
      proposedEndsAt: null,
    };
    await insertLifecycleSideEffects(ctx, db, {
      appointment: updated,
      actorUserId: principal.userId,
      actorRole: actor,
      action: "DECLINE_RESCHEDULE",
      fromStatus: appointment.status as AppointmentStatus,
      toStatus: rule.to,
      historyEvent: rule.historyEvent,
      auditAction: "APPOINTMENT_CONFIRMED",
      outboxKey: "AppointmentConfirmed",
      metadata: {
        appointmentPublicId: appointment.publicId,
        declinedReschedule: true,
      },
      hooks: input.hooks,
    });
    return {
      ok: true,
      publicId: appointment.publicId,
      status: rule.to,
      version: nextVersion,
      message: LIFECYCLE_SAFE_MESSAGES.rescheduleDeclined,
      start: appointment.startsAt.toISOString(),
      end: appointment.endsAt.toISOString(),
    };
  });
}
