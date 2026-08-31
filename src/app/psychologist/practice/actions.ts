"use server";

import { redirect } from "next/navigation";

import { getPracticeDashboardSummary } from "@/lib/practice/dashboard";
import {
  getPracticePatientDetail,
  listPracticePatients,
  updatePracticePatientProfile,
} from "@/lib/practice/patients";
import { requireAuthorizedPracticeSession, loadAuthorizedPracticeSession } from "@/lib/practice/session";
import {
  getPracticeSettings,
  savePracticeSettings,
} from "@/lib/practice/settings";

export async function requirePracticeSession() {
  return requireAuthorizedPracticeSession();
}

export async function loadPracticeDashboard() {
  const session = await requirePracticeSession();
  return getPracticeDashboardSummary(session.ctx, session.principal);
}

export async function loadPracticePatientsPage(input: {
  q?: string;
  status?: string;
  page?: number;
}) {
  const session = await requirePracticeSession();
  return listPracticePatients(session.ctx, session.principal, input);
}

export async function loadPracticePatientPage(publicId: string) {
  const session = await requirePracticeSession();
  return getPracticePatientDetail(session.ctx, session.principal, publicId);
}

export async function loadPracticeSettingsPage() {
  const session = await requirePracticeSession();
  return getPracticeSettings(session.ctx, session.principal);
}

export async function savePracticeSettingsAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const loaded = await loadAuthorizedPracticeSession();
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }
  const result = await savePracticeSettings(
    loaded.ctx,
    loaded.principal,
    formData,
  );
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: result.message };
}

export async function updatePracticePatientAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const loaded = await loadAuthorizedPracticeSession();
  if (!loaded.ok) {
    return { ok: false, message: loaded.message };
  }
  const result = await updatePracticePatientProfile(
    loaded.ctx,
    loaded.principal,
    {
      patientPublicId: String(formData.get("patientPublicId") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      status: String(formData.get("status") ?? ""),
    },
  );
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: result.message };
}
