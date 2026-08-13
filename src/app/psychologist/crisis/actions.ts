"use server";

import { redirect } from "next/navigation";

import { getPsychologistSession } from "@/lib/question-portal/auth";
import {
  markCrisisNeedsReviewIfOverdue,
  upsertCrisisResource,
} from "@/lib/crisis/service";
import type { CrisisUpsertParsed } from "@/lib/crisis/schema";

export async function saveCrisisResourceAction(input: CrisisUpsertParsed) {
  const session = await getPsychologistSession();
  try {
    const saved = await upsertCrisisResource(session, input);
    return { ok: true as const, slug: saved.slug };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/psychologist/login");
    }
    if (error instanceof Error && error.message === "DUPLICATE_SLUG") {
      return { ok: false as const, message: "That slug is already in use." };
    }
    return {
      ok: false as const,
      message: "The crisis resource could not be saved. Check required fields and HTTPS source URLs.",
    };
  }
}

export async function flagOverdueCrisisResourcesAction() {
  const session = await getPsychologistSession();
  try {
    await markCrisisNeedsReviewIfOverdue(session);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/psychologist/login");
    }
  }
  redirect("/psychologist/crisis");
}
