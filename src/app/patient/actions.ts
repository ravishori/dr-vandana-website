"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearPracticeSession,
  completeMfa,
  enablePsychologistMfa,
  getPracticeSession,
  loginPracticeUser,
  registerPatient,
  requestPasswordReset,
  resetPassword,
  sendMobileOtp,
  verifyEmailToken,
  verifyMobileOtp,
} from "@/lib/practice/auth-service";
import {
  approveReschedule,
  cancelAppointmentByPsychologist,
  completeAppointment,
  confirmAppointment,
  getAvailableSlots,
  markNoShow,
  rejectAppointment,
  requestAppointment,
  requestCancellation,
  requestReschedule,
} from "@/lib/practice/appointment-service";
import {
  addConsultationNote,
  createConsultationFromAppointment,
  setDocumentVisibility,
  uploadPatientDocument,
} from "@/lib/practice/clinical-service";
import { getPracticeRepository } from "@/lib/practice/store";

export async function patientRegisterAction(formData: FormData) {
  const result = await registerPatient({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    mobile: String(formData.get("mobile") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    consentAccepted: formData.get("consentAccepted") === "on",
    privacyAccepted: formData.get("privacyAccepted") === "on",
  });
  if (!result.ok) {
    return result;
  }
  redirect(`/patient/verify?userId=${result.userId}`);
}

export async function patientLoginAction(formData: FormData) {
  const result = await loginPracticeUser({
    emailOrMobile: String(formData.get("emailOrMobile") ?? ""),
    password: String(formData.get("password") ?? ""),
    totp: String(formData.get("totp") ?? "") || undefined,
  });
  if (!result.ok) {
    return result;
  }
  if (result.role === "PSYCHOLOGIST") {
    redirect("/psychologist/practice");
  }
  redirect("/patient/dashboard");
}

export async function practiceLogoutAction() {
  await clearPracticeSession();
  redirect("/");
}

export async function verifyEmailAction(token: string) {
  return verifyEmailToken(token);
}

export async function sendOtpAction(userId: string) {
  return sendMobileOtp(userId);
}

export async function verifyOtpAction(userId: string, code: string) {
  return verifyMobileOtp(userId, code);
}

export async function forgotPasswordAction(formData: FormData) {
  return requestPasswordReset(String(formData.get("email") ?? ""));
}

export async function resetPasswordAction(formData: FormData) {
  return resetPassword(
    String(formData.get("token") ?? ""),
    String(formData.get("password") ?? ""),
  );
}

export async function bookAppointmentAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    redirect("/patient/login");
  }
  return requestAppointment(session, {
    consultationTypeId: String(formData.get("consultationTypeId") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    patientNotes: String(formData.get("patientNotes") ?? "") || undefined,
    idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
  });
}

export async function loadSlotsAction(date: string, consultationTypeId: string) {
  return getAvailableSlots(date, consultationTypeId);
}

export async function patientCancelAction(appointmentId: string, reason: string) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return requestCancellation(session, appointmentId, reason);
}

export async function patientRescheduleAction(
  appointmentId: string,
  preferredStartsAt: string,
  reason: string,
) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return requestReschedule(session, appointmentId, preferredStartsAt, reason);
}

export async function psychologistConfirmAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  await confirmAppointment(session, String(formData.get("appointmentId") ?? ""));
  revalidatePath("/psychologist/practice");
}

export async function psychologistRejectAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  await rejectAppointment(session, String(formData.get("appointmentId") ?? ""));
  revalidatePath("/psychologist/practice");
}

export async function psychologistCompleteAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  const id = String(formData.get("appointmentId") ?? "");
  const result = await completeAppointment(session, id);
  if (result.ok) {
    await createConsultationFromAppointment(session, id);
  }
  revalidatePath("/psychologist/practice");
}

export async function psychologistNoShowAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  await markNoShow(session, String(formData.get("appointmentId") ?? ""));
  revalidatePath("/psychologist/practice");
}

export async function psychologistCancelAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  await cancelAppointmentByPsychologist(
    session,
    String(formData.get("appointmentId") ?? ""),
    String(formData.get("reason") ?? "Cancelled by practice"),
  );
  revalidatePath("/psychologist/practice");
}

export async function psychologistApproveRescheduleAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  await approveReschedule(
    session,
    String(formData.get("appointmentId") ?? ""),
    String(formData.get("startsAt") ?? ""),
  );
  revalidatePath("/psychologist/practice");
}

export async function psychologistAddNoteAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  await addConsultationNote(session, {
    consultationId: String(formData.get("consultationId") ?? ""),
    visibility:
      formData.get("visibility") === "PATIENT_VISIBLE"
        ? "PATIENT_VISIBLE"
        : "PRIVATE",
    body: String(formData.get("body") ?? ""),
  });
  revalidatePath("/psychologist/practice/patients");
}

export async function psychologistEnableMfaAction() {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return enablePsychologistMfa(session);
}

export async function psychologistCompleteMfaAction(formData: FormData) {
  return completeMfa(String(formData.get("totp") ?? ""));
}

export async function psychologistUploadDocumentAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return;
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  await uploadPatientDocument(session, {
    patientId: String(formData.get("patientId") ?? ""),
    title: String(formData.get("title") ?? file.name),
    documentType: String(formData.get("documentType") ?? "other"),
    visibility:
      formData.get("visibility") === "PATIENT_VISIBLE"
        ? "PATIENT_VISIBLE"
        : "PRIVATE",
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    bytes,
  });
  revalidatePath("/psychologist/practice/patients");
}

export async function psychologistShareDocumentAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  const visibility =
    formData.get("visibility") === "PATIENT_VISIBLE"
      ? "PATIENT_VISIBLE"
      : "PRIVATE";
  await setDocumentVisibility(
    session,
    String(formData.get("documentId") ?? ""),
    visibility,
  );
  revalidatePath("/psychologist/practice/patients");
}

export async function upsertAvailabilityAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    throw new Error("UNAUTHORIZED");
  }
  const repo = await getPracticeRepository();
  await repo.upsertAvailabilityRule({
    id: String(formData.get("id") || crypto.randomUUID()),
    dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
    startTime: String(formData.get("startTime") ?? "10:00"),
    endTime: String(formData.get("endTime") ?? "13:00"),
    consultationTypeId: String(formData.get("consultationTypeId") || "") || null,
    isActive: formData.get("isActive") !== "off",
  });
  revalidatePath("/psychologist/practice/calendar");
}

export async function blockDateAction(formData: FormData) {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    throw new Error("UNAUTHORIZED");
  }
  const repo = await getPracticeRepository();
  await repo.upsertAvailabilityException({
    id: crypto.randomUUID(),
    date: String(formData.get("date") ?? ""),
    startTime: null,
    endTime: null,
    isBlocked: true,
    reason: String(formData.get("reason") ?? "Unavailable"),
  });
  revalidatePath("/psychologist/practice/calendar");
}
