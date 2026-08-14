"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import type { IdentityContext } from "@/lib/identity/context";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markAppointmentNoShow,
  rejectAppointment,
  rescheduleAppointment,
} from "@/lib/appointments/lifecycle";
import {
  getPracticeAppointmentDetail,
  listPracticeAppointments,
  listRescheduleSlots,
} from "@/lib/appointments/queries";
import { authorizationService } from "@/lib/identity/authorization";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { readSession } from "@/lib/identity/sessions";

export type PracticeActionResult =
  | { ok: true; message: string; status?: string; version?: number; start?: string; end?: string }
  | { ok: false; message: string };

async function loadPracticeSession() {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false as const, message: "Please sign in to continue." };
  }
  const session = await readSession(identity.ctx, await readPracticeSessionCookie());
  if (!session) {
    return { ok: false as const, message: "Please sign in to continue." };
  }
  const principal = await loadPrincipal(identity.ctx, session);
  const access = authorizationService.canAccess(principal, {
    roles: ["PSYCHOLOGIST"],
    permission: "MANAGE_APPOINTMENT_SETTINGS",
  });
  if (!access.allowed) {
    return { ok: false as const, message: "You do not have access to that." };
  }
  return { ok: true as const, ctx: identity.ctx, principal };
}

export async function requirePracticeAppointmentsSession() {
  const loaded = await loadPracticeSession();
  if (!loaded.ok) {
    redirect("/psychologist/practice/login");
  }
  return loaded;
}

export async function loadPracticeAppointmentsPage(input: {
  filter?: string;
  fromLocal?: string;
  toLocal?: string;
  page?: number;
}) {
  const session = await requirePracticeAppointmentsSession();
  return listPracticeAppointments(session.ctx, session.principal, input);
}

export async function loadPracticeAppointmentPage(publicId: string) {
  const session = await requirePracticeAppointmentsSession();
  return getPracticeAppointmentDetail(session.ctx, session.principal, publicId);
}

async function mutate(
  run: (
    ctx: IdentityContext,
    principal: AuthorizationPrincipal,
    ip: string,
  ) => Promise<PracticeActionResult>,
): Promise<PracticeActionResult> {
  const loaded = await loadPracticeSession();
  if (!loaded.ok) {
    return loaded;
  }
  return run(loaded.ctx, loaded.principal, getClientIpFromHeaders(await headers()));
}

export async function confirmAppointmentAction(input: {
  publicId: string;
  expectedVersion: number;
}): Promise<PracticeActionResult> {
  return mutate(async (ctx, principal, ip) => {
    const result = await confirmAppointment(ctx, {
      principal,
      ipAddress: ip,
      publicId: input.publicId,
      expectedVersion: input.expectedVersion,
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return {
      ok: true,
      message: result.message,
      status: result.status,
      version: result.version,
    };
  });
}

export async function rejectAppointmentAction(input: {
  publicId: string;
  expectedVersion: number;
  reasonNote?: string;
}): Promise<PracticeActionResult> {
  return mutate(async (ctx, principal, ip) => {
    const result = await rejectAppointment(ctx, {
      principal,
      ipAddress: ip,
      publicId: input.publicId,
      expectedVersion: input.expectedVersion,
      reasonNote: input.reasonNote,
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return { ok: true, message: result.message, status: result.status, version: result.version };
  });
}

export async function cancelAppointmentAction(input: {
  publicId: string;
  expectedVersion: number;
  reasonCode?: string;
  reasonNote?: string;
}): Promise<PracticeActionResult> {
  return mutate(async (ctx, principal, ip) => {
    const result = await cancelAppointment(ctx, {
      principal,
      ipAddress: ip,
      publicId: input.publicId,
      expectedVersion: input.expectedVersion,
      reasonCode: input.reasonCode,
      reasonNote: input.reasonNote,
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return { ok: true, message: result.message, status: result.status, version: result.version };
  });
}

export async function completeAppointmentAction(input: {
  publicId: string;
  expectedVersion: number;
}): Promise<PracticeActionResult> {
  return mutate(async (ctx, principal, ip) => {
    const result = await completeAppointment(ctx, {
      principal,
      ipAddress: ip,
      publicId: input.publicId,
      expectedVersion: input.expectedVersion,
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return { ok: true, message: result.message, status: result.status, version: result.version };
  });
}

export async function markNoShowAction(input: {
  publicId: string;
  expectedVersion: number;
}): Promise<PracticeActionResult> {
  return mutate(async (ctx, principal, ip) => {
    const result = await markAppointmentNoShow(ctx, {
      principal,
      ipAddress: ip,
      publicId: input.publicId,
      expectedVersion: input.expectedVersion,
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return { ok: true, message: result.message, status: result.status, version: result.version };
  });
}

export async function rescheduleAppointmentAction(input: {
  publicId: string;
  expectedVersion: number;
  requestedStart: string;
}): Promise<PracticeActionResult> {
  return mutate(async (ctx, principal, ip) => {
    const result = await rescheduleAppointment(ctx, {
      principal,
      ipAddress: ip,
      publicId: input.publicId,
      expectedVersion: input.expectedVersion,
      requestedStart: input.requestedStart,
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return {
      ok: true,
      message: result.message,
      status: result.status,
      version: result.version,
      start: result.start,
      end: result.end,
    };
  });
}

export async function loadRescheduleSlotsAction(input: {
  publicId: string;
  dateLocal: string;
}) {
  const loaded = await loadPracticeSession();
  if (!loaded.ok) {
    return loaded;
  }
  return listRescheduleSlots(loaded.ctx, loaded.principal, input);
}
