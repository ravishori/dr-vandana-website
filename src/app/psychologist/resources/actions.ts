"use server";

import { redirect } from "next/navigation";

import { getPsychologistSession } from "@/lib/question-portal/auth";
import {
  archiveResource,
  upsertResource,
} from "@/lib/resources/service";
import type { ResourceUpsertInput } from "@/lib/resources/schema";

export async function saveResourceAction(input: ResourceUpsertInput) {
  const session = await getPsychologistSession();
  try {
    const saved = await upsertResource(session, input);
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
      message: "The resource could not be saved. Please check the fields.",
    };
  }
}

export async function archiveResourceAction(slug: string) {
  const session = await getPsychologistSession();
  try {
    await archiveResource(session, slug);
    return { ok: true as const };
  } catch {
    return { ok: false as const, message: "The resource could not be archived." };
  }
}
