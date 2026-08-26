import { cookies } from "next/headers";

import { questionPortalConfig } from "@/config/question-portal";
import {
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/question-portal/session";
import type { PsychologistSession } from "@/types/question-portal";

export async function getPsychologistSession(): Promise<PsychologistSession | null> {
  const store = await cookies();
  const token = store.get(questionPortalConfig.cookieName)?.value;
  return readSessionToken(token);
}

export async function requirePsychologistSession(): Promise<PsychologistSession> {
  const session = await getPsychologistSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(questionPortalConfig.cookieName, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(questionPortalConfig.cookieName, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}
