"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { availabilityService } from "@/lib/appointments/availability";
import {
  listBookableAppointmentTypes,
  requestAppointment,
} from "@/lib/appointments/booking";
import {
  APPOINTMENT_RATE_LIMITS,
  BOOKING_SAFE_MESSAGES,
  LIFECYCLE_SAFE_MESSAGES,
} from "@/lib/appointments/constants";
import {
  cancelAppointment,
  requestRescheduleAppointment,
} from "@/lib/appointments/lifecycle";
import {
  authorizePortalPatient,
  getPatientAppointmentDetail,
  listPatientAppointments,
  listPatientRescheduleSlots,
} from "@/lib/appointments/patient-portal";
import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { readSession } from "@/lib/identity/sessions";

export type BookingActionResult =
  | {
      ok: true;
      message: string;
      appointment: {
        publicId: string;
        appointmentType: { publicId: string; name: string; durationMinutes: number };
        date: string;
        start: string;
        end: string;
        timezone: string;
        status: "PENDING";
      };
    }
  | { ok: false; message: string };

async function loadBookableSession() {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false as const, message: BOOKING_SAFE_MESSAGES.unauthenticated };
  }
  const session = await readSession(
    identity.ctx,
    await readPracticeSessionCookie(),
  );
  if (!session) {
    return { ok: false as const, message: BOOKING_SAFE_MESSAGES.unauthenticated };
  }
  const principal = await loadPrincipal(identity.ctx, session);
  return { ok: true as const, ctx: identity.ctx, principal };
}

export async function loadBookingSlotsAction(input: {
  appointmentTypePublicId: string;
  dateLocal: string;
}): Promise<
  | {
      ok: true;
      date: string;
      timezone: string;
      appointmentType: { publicId: string; name: string; durationMinutes: number };
      slots: { start: string; end: string }[];
    }
  | { ok: false; message: string }
> {
  const loaded = await loadBookableSession();
  if (!loaded.ok) {
    return loaded;
  }
  const ip = getClientIpFromHeaders(await headers());
  const limited = await loaded.ctx.rateLimit.consume(
    `appointment-slots:${loaded.principal.userId}:${ip}`,
    APPOINTMENT_RATE_LIMITS.mutate.max,
    APPOINTMENT_RATE_LIMITS.mutate.windowMs,
  );
  if (!limited.allowed) {
    return { ok: false, message: BOOKING_SAFE_MESSAGES.rateLimited };
  }
  const types = await listBookableAppointmentTypes(loaded.ctx, loaded.principal);
  if (!types.ok) {
    return { ok: false, message: types.message };
  }
  const result = await availabilityService.getAvailableSlots(loaded.ctx, {
    appointmentTypePublicId: input.appointmentTypePublicId,
    dateLocal: input.dateLocal,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return result;
}

export async function requestAppointmentAction(input: {
  appointmentTypePublicId: string;
  requestedStart: string;
  idempotencyKey: string;
}): Promise<BookingActionResult> {
  const loaded = await loadBookableSession();
  if (!loaded.ok) {
    return loaded;
  }
  const result = await requestAppointment(loaded.ctx, {
    principal: loaded.principal,
    ipAddress: getClientIpFromHeaders(await headers()),
    appointmentTypePublicId: input.appointmentTypePublicId,
    requestedStart: input.requestedStart,
    idempotencyKey: input.idempotencyKey,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return {
    ok: true,
    message: result.message,
    appointment: result.appointment,
  };
}

export async function requirePatientBookingSession() {
  const loaded = await loadBookableSession();
  if (!loaded.ok) {
    redirect("/patient/login");
  }
  const types = await listBookableAppointmentTypes(loaded.ctx, loaded.principal);
  if (!types.ok) {
    redirect("/patient/login");
  }
  return {
    appointmentTypes: types.appointmentTypes,
    todayLocal: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(loaded.ctx.now()),
  };
}

export type PatientPortalActionResult =
  | { ok: true; message: string; status?: string; version?: number }
  | { ok: false; message: string };

async function loadPortalSession() {
  const loaded = await loadBookableSession();
  if (!loaded.ok) {
    return {
      ok: false as const,
      code: "UNAUTHENTICATED" as const,
      message: LIFECYCLE_SAFE_MESSAGES.sessionExpired,
    };
  }
  const authorized = await authorizePortalPatient(loaded.ctx, loaded.principal);
  if (!authorized.ok) {
    return authorized;
  }
  return {
    ok: true as const,
    ctx: loaded.ctx,
    principal: authorized.principal,
  };
}

export async function requirePatientPortalSession() {
  const loaded = await loadPortalSession();
  if (!loaded.ok) {
    if (loaded.code === "UNAUTHENTICATED") {
      redirect("/patient/login");
    }
    return loaded;
  }
  return loaded;
}

export async function loadPatientAppointmentsPage(input: {
  filter?: string;
  fromLocal?: string;
  toLocal?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await requirePatientPortalSession();
  if (!session.ok) {
    return session;
  }
  return listPatientAppointments(session.ctx, session.principal, {
    ...input,
    ipAddress: getClientIpFromHeaders(await headers()),
  });
}

export async function loadPatientAppointmentPage(publicId: string) {
  const session = await requirePatientPortalSession();
  if (!session.ok) {
    return session;
  }
  return getPatientAppointmentDetail(
    session.ctx,
    session.principal,
    publicId,
    getClientIpFromHeaders(await headers()),
  );
}

export async function cancelPatientAppointmentAction(input: {
  publicId: string;
  expectedVersion: number;
}): Promise<PatientPortalActionResult> {
  const session = await loadPortalSession();
  if (!session.ok) {
    return { ok: false, message: session.message };
  }
  const result = await cancelAppointment(session.ctx, {
    principal: session.principal,
    ipAddress: getClientIpFromHeaders(await headers()),
    publicId: input.publicId,
    expectedVersion: input.expectedVersion,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: result.message, status: result.status, version: result.version };
}

export async function requestPatientRescheduleAction(input: {
  publicId: string;
  expectedVersion: number;
  requestedStart: string;
}): Promise<PatientPortalActionResult> {
  const session = await loadPortalSession();
  if (!session.ok) {
    return { ok: false, message: session.message };
  }
  const result = await requestRescheduleAppointment(session.ctx, {
    principal: session.principal,
    ipAddress: getClientIpFromHeaders(await headers()),
    publicId: input.publicId,
    expectedVersion: input.expectedVersion,
    requestedStart: input.requestedStart,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: result.message, status: result.status, version: result.version };
}

export async function loadPatientRescheduleSlotsAction(input: {
  publicId: string;
  dateLocal: string;
}) {
  const session = await loadPortalSession();
  if (!session.ok) {
    return session;
  }
  return listPatientRescheduleSlots(session.ctx, session.principal, {
    publicId: input.publicId,
    dateLocal: input.dateLocal,
    ipAddress: getClientIpFromHeaders(await headers()),
  });
}
