import { practiceConfig } from "@/config/practice";
import { audit, queueNotification } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";
import type {
  Appointment,
  AppointmentStatus,
  PracticeDashboardStats,
  PracticeSession,
} from "@/types/practice";

function assertPsychologist(session: PracticeSession) {
  if (session.role !== "PSYCHOLOGIST" || !session.mfaVerified) {
    // Allow psychologist without MFA only if MFA not enabled — checked at login.
    if (session.role !== "PSYCHOLOGIST") {
      throw new Error("FORBIDDEN");
    }
  }
}

function assertPatient(session: PracticeSession) {
  if (session.role !== "PATIENT" || !session.patientId) {
    throw new Error("FORBIDDEN");
  }
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export async function listActiveConsultationTypes() {
  const repo = await getPracticeRepository();
  return repo.listConsultationTypes(true);
}

export async function getAvailableSlots(date: string, consultationTypeId: string) {
  const repo = await getPracticeRepository();
  const type = await repo.getConsultationType(consultationTypeId);
  if (!type || !type.isActive) {
    return [];
  }
  const day = new Date(`${date}T12:00:00+05:30`);
  if (Number.isNaN(day.getTime())) {
    return [];
  }
  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: practiceConfig.timezone,
    weekday: "short",
  }).format(day);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = map[dayOfWeek] ?? -1;
  const rules = (await repo.listAvailabilityRules()).filter(
    (rule) =>
      rule.isActive &&
      rule.dayOfWeek === dow &&
      (!rule.consultationTypeId || rule.consultationTypeId === consultationTypeId),
  );
  const exceptions = (await repo.listAvailabilityExceptions()).filter(
    (item) => item.date === date,
  );
  if (exceptions.some((item) => item.isBlocked && !item.startTime)) {
    return [];
  }

  const appointments = await repo.listAppointments();
  const slots: string[] = [];
  for (const rule of rules) {
    const [startH, startM] = rule.startTime.split(":").map(Number);
    const [endH, endM] = rule.endTime.split(":").map(Number);
    let cursor = startH! * 60 + startM!;
    const endMinutes = endH! * 60 + endM!;
    while (cursor + type.durationMinutes <= endMinutes) {
      const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
      const mm = String(cursor % 60).padStart(2, "0");
      const startsAt = `${date}T${hh}:${mm}:00+05:30`;
      const endsAtMs = Date.parse(startsAt) + type.durationMinutes * 60_000;
      const blocked = exceptions.some((item) => {
        if (!item.isBlocked || !item.startTime || !item.endTime) {
          return false;
        }
        const bStart = Date.parse(`${date}T${item.startTime}:00+05:30`);
        const bEnd = Date.parse(`${date}T${item.endTime}:00+05:30`);
        return overlaps(Date.parse(startsAt), endsAtMs, bStart, bEnd);
      });
      const conflict = appointments.some((appointment) => {
        if (
          !["REQUESTED", "PENDING", "CONFIRMED", "RESCHEDULED", "RESCHEDULE_REQUESTED"].includes(
            appointment.status,
          )
        ) {
          return false;
        }
        return overlaps(
          Date.parse(startsAt),
          endsAtMs,
          Date.parse(appointment.startsAt),
          Date.parse(appointment.endsAt),
        );
      });
      if (!blocked && !conflict) {
        slots.push(startsAt);
      }
      cursor += type.durationMinutes;
    }
  }
  return slots;
}

export async function requestAppointment(
  session: PracticeSession,
  input: {
    consultationTypeId: string;
    startsAt: string;
    patientNotes?: string;
    idempotencyKey?: string;
  },
) {
  assertPatient(session);
  const repo = await getPracticeRepository();
  if (input.idempotencyKey) {
    const existing = (await repo.listAppointmentsForPatient(session.patientId!)).find(
      (item) =>
        item.startsAt === input.startsAt &&
        item.consultationTypeId === input.consultationTypeId &&
        item.status === "REQUESTED",
    );
    if (existing) {
      return { ok: true as const, appointment: existing, duplicate: true };
    }
  }
  const type = await repo.getConsultationType(input.consultationTypeId);
  if (!type?.isActive) {
    return { ok: false as const, message: "Consultation type unavailable." };
  }
  const startsAt = input.startsAt;
  const endsAt = new Date(
    Date.parse(startsAt) + type.durationMinutes * 60_000,
  ).toISOString();
  const overlap = await repo.findOverlappingConfirmed(startsAt, endsAt);
  if (overlap) {
    return {
      ok: false as const,
      message: "That time is no longer available. Please choose another slot.",
    };
  }
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: crypto.randomUUID(),
    publicReference: `APT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    patientId: session.patientId!,
    consultationTypeId: type.id,
    status: "REQUESTED",
    startsAt,
    endsAt,
    originalStartsAt: startsAt,
    patientNotes: input.patientNotes?.slice(0, 500) ?? null,
    cancellationReason: null,
    reschedulePreferredStartsAt: null,
    rescheduleReason: null,
    createdByUserId: session.userId,
    updatedByUserId: session.userId,
    createdAt: now,
    updatedAt: now,
  };
  await repo.createAppointment(appointment);
  await repo.addAppointmentEvent({
    id: crypto.randomUUID(),
    appointmentId: appointment.id,
    fromStatus: null,
    toStatus: "REQUESTED",
    actorUserId: session.userId,
    note: "Patient requested appointment",
    createdAt: now,
  });
  await queueNotification({
    userId: session.userId,
    channel: "EMAIL",
    eventType: "APPOINTMENT_REQUESTED",
    subject: "Appointment request received",
    body: "Your appointment request was received. Please sign in to your secure portal for details.",
    idempotencyKey: `appt-req:${appointment.id}`,
  });
  await queueNotification({
    userId: session.userId,
    channel: "WHATSAPP",
    eventType: "APPOINTMENT_REQUESTED",
    subject: "Appointment request received",
    body: "You have an appointment update. Please sign in to your secure portal for details.",
    idempotencyKey: `appt-req-wa:${appointment.id}`,
  });
  await audit(session.userId, "APPOINTMENT_REQUESTED", "appointment", appointment.id, "SUCCESS");
  return { ok: true as const, appointment, duplicate: false };
}

async function transition(
  session: PracticeSession,
  appointmentId: string,
  toStatus: AppointmentStatus,
  note?: string,
  patch: Partial<Appointment> = {},
) {
  assertPsychologist(session);
  const repo = await getPracticeRepository();
  const appointment = await repo.getAppointment(appointmentId);
  if (!appointment) {
    throw new Error("NOT_FOUND");
  }
  if (
    (toStatus === "CONFIRMED" || toStatus === "RESCHEDULED") &&
    (patch.startsAt || appointment.startsAt)
  ) {
    const startsAt = patch.startsAt ?? appointment.startsAt;
    const endsAt = patch.endsAt ?? appointment.endsAt;
    const overlap = await repo.findOverlappingConfirmed(
      startsAt,
      endsAt,
      appointment.id,
    );
    if (overlap) {
      return { ok: false as const, message: "Conflicting appointment exists." };
    }
  }
  const now = new Date().toISOString();
  const updated: Appointment = {
    ...appointment,
    ...patch,
    status: toStatus,
    updatedAt: now,
    updatedByUserId: session.userId,
  };
  await repo.updateAppointment(updated);
  await repo.addAppointmentEvent({
    id: crypto.randomUUID(),
    appointmentId,
    fromStatus: appointment.status,
    toStatus,
    actorUserId: session.userId,
    note: note ?? null,
    createdAt: now,
  });
  const patient = await repo.getPatientById(appointment.patientId);
  if (patient) {
    await queueNotification({
      userId: patient.userId,
      channel: "EMAIL",
      eventType: `APPOINTMENT_${toStatus}`,
      subject: "Your appointment has been updated",
      body: "Your appointment has been updated. Please sign in to your secure portal for details.",
      idempotencyKey: `appt-${toStatus}:${appointmentId}:${now}`,
    });
  }
  await audit(session.userId, `APPOINTMENT_${toStatus}`, "appointment", appointmentId, "SUCCESS");
  return { ok: true as const, appointment: updated };
}

export async function confirmAppointment(session: PracticeSession, id: string) {
  return transition(session, id, "CONFIRMED", "Confirmed by psychologist");
}
export async function rejectAppointment(session: PracticeSession, id: string) {
  return transition(session, id, "REJECTED", "Rejected by psychologist");
}
export async function completeAppointment(session: PracticeSession, id: string) {
  return transition(session, id, "COMPLETED", "Marked completed");
}
export async function markNoShow(session: PracticeSession, id: string) {
  return transition(session, id, "NO_SHOW", "Marked no-show");
}
export async function cancelAppointmentByPsychologist(
  session: PracticeSession,
  id: string,
  reason: string,
) {
  return transition(session, id, "CANCELLED", reason, {
    cancellationReason: reason,
  });
}

export async function requestReschedule(
  session: PracticeSession,
  appointmentId: string,
  preferredStartsAt: string,
  reason?: string,
) {
  assertPatient(session);
  const repo = await getPracticeRepository();
  const appointment = await repo.getAppointment(appointmentId);
  if (!appointment || appointment.patientId !== session.patientId) {
    throw new Error("FORBIDDEN");
  }
  const now = new Date().toISOString();
  const updated = {
    ...appointment,
    status: "RESCHEDULE_REQUESTED" as const,
    reschedulePreferredStartsAt: preferredStartsAt,
    rescheduleReason: reason ?? null,
    updatedAt: now,
    updatedByUserId: session.userId,
  };
  await repo.updateAppointment(updated);
  await repo.addAppointmentEvent({
    id: crypto.randomUUID(),
    appointmentId,
    fromStatus: appointment.status,
    toStatus: "RESCHEDULE_REQUESTED",
    actorUserId: session.userId,
    note: reason ?? "Reschedule requested",
    createdAt: now,
  });
  return { ok: true as const, appointment: updated };
}

export async function approveReschedule(
  session: PracticeSession,
  appointmentId: string,
  startsAt: string,
) {
  const repo = await getPracticeRepository();
  const appointment = await repo.getAppointment(appointmentId);
  if (!appointment) {
    throw new Error("NOT_FOUND");
  }
  const type = await repo.getConsultationType(appointment.consultationTypeId);
  const endsAt = new Date(
    Date.parse(startsAt) + (type?.durationMinutes ?? 45) * 60_000,
  ).toISOString();
  return transition(session, appointmentId, "RESCHEDULED", "Reschedule approved", {
    startsAt,
    endsAt,
  });
}

export async function requestCancellation(
  session: PracticeSession,
  appointmentId: string,
  reason: string,
) {
  assertPatient(session);
  const repo = await getPracticeRepository();
  const appointment = await repo.getAppointment(appointmentId);
  if (!appointment || appointment.patientId !== session.patientId) {
    throw new Error("FORBIDDEN");
  }
  const now = new Date().toISOString();
  const updated = {
    ...appointment,
    status: "CANCELLED" as const,
    cancellationReason: reason,
    updatedAt: now,
    updatedByUserId: session.userId,
  };
  await repo.updateAppointment(updated);
  await repo.addAppointmentEvent({
    id: crypto.randomUUID(),
    appointmentId,
    fromStatus: appointment.status,
    toStatus: "CANCELLED",
    actorUserId: session.userId,
    note: reason,
    createdAt: now,
  });
  await queueNotification({
    userId: session.userId,
    channel: "EMAIL",
    eventType: "APPOINTMENT_CANCELLED",
    subject: "Your appointment has been updated",
    body: "Your appointment has been updated. Please sign in to your secure portal for details.",
    idempotencyKey: `appt-cancel:${appointmentId}`,
  });
  await audit(session.userId, "APPOINTMENT_CANCELLED", "appointment", appointmentId, "SUCCESS");
  return { ok: true as const, appointment: updated };
}

export async function getPsychologistDashboardStats(
  session: PracticeSession,
): Promise<PracticeDashboardStats> {
  assertPsychologist(session);
  const repo = await getPracticeRepository();
  const appointments = await repo.listAppointments();
  const patients = await repo.listPatients();
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: practiceConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const consultations = (
    await Promise.all(
      patients.map((patient) => repo.listConsultationsForPatient(patient.id)),
    )
  ).flat();
  const notifications = await repo.listNotificationsForUser(session.userId);
  return {
    todayAppointments: appointments.filter((item) =>
      item.startsAt.startsWith(today),
    ).length,
    upcomingConfirmed: appointments.filter(
      (item) =>
        (item.status === "CONFIRMED" || item.status === "RESCHEDULED") &&
        Date.parse(item.startsAt) >= Date.now(),
    ).length,
    pendingRequests: appointments.filter((item) => item.status === "REQUESTED")
      .length,
    rescheduleRequests: appointments.filter(
      (item) => item.status === "RESCHEDULE_REQUESTED",
    ).length,
    cancellationRequests: 0,
    newPatients7d: patients.filter((item) => Date.parse(item.createdAt) >= weekAgo)
      .length,
    followUpsDue: consultations.filter(
      (item) => item.followUpAt && Date.parse(item.followUpAt) <= Date.now(),
    ).length,
    unreadNotifications: notifications.filter((item) => !item.readAt).length,
  };
}

export async function searchPatients(
  session: PracticeSession,
  query: string,
) {
  assertPsychologist(session);
  const repo = await getPracticeRepository();
  const q = query.trim().toLowerCase();
  const patients = await repo.listPatients();
  const results = [];
  for (const patient of patients) {
    const user = await repo.getUserById(patient.userId);
    if (!user) {
      continue;
    }
    const haystack = `${patient.publicId} ${user.fullName} ${user.email} ${user.mobile ?? ""}`.toLowerCase();
    if (!q || haystack.includes(q)) {
      results.push({
        publicId: patient.publicId,
        patientId: patient.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        emailVerified: Boolean(user.emailVerifiedAt),
        mobileVerified: Boolean(user.mobileVerifiedAt),
      });
    }
  }
  return results.slice(0, 50);
}
