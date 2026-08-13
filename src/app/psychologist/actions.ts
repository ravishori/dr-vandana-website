"use server";

import { redirect } from "next/navigation";

import { getPsychologistSession } from "@/lib/question-portal/auth";
import {
  archivePsychologistQuestion,
  getPsychologistQuestion,
  prepareAiAssistedDraft,
  sendPsychologistResponse,
  updatePsychologistQuestion,
} from "@/lib/question-portal/service";
import type { PsychologistUpdateInput } from "@/lib/question-portal/schema";

export async function updateQuestionAction(input: PsychologistUpdateInput) {
  const session = await getPsychologistSession();
  try {
    await updatePsychologistQuestion(session, input);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/psychologist/login");
    }
    return { ok: false as const, message: "The question could not be updated." };
  }
}

export async function archiveQuestionAction(publicReferenceId: string) {
  const session = await getPsychologistSession();
  try {
    await archivePsychologistQuestion(session, publicReferenceId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, message: "The question could not be archived." };
  }
}

export async function sendResponseAction(publicReferenceId: string) {
  const session = await getPsychologistSession();
  try {
    return await sendPsychologistResponse(session, publicReferenceId);
  } catch {
    return { ok: false as const, message: "The response could not be sent." };
  }
}

export async function createAiDraftAction(publicReferenceId: string) {
  const session = await getPsychologistSession();
  try {
    return await prepareAiAssistedDraft(session, publicReferenceId);
  } catch {
    return {
      ok: false as const,
      message: "An educational draft could not be prepared.",
    };
  }
}

export async function loadQuestionAction(publicReferenceId: string) {
  const session = await getPsychologistSession();
  return getPsychologistQuestion(session, publicReferenceId);
}
