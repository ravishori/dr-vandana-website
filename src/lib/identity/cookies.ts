import { cookies } from "next/headers";

import { PRACTICE_SESSION_COOKIE } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { sessionCookieOptions } from "@/lib/identity/sessions";

export async function setPracticeSessionCookie(
  ctx: IdentityContext,
  token: string,
  expiresAt: Date,
): Promise<void> {
  const store = await cookies();
  const maxAge = Math.max(
    1,
    Math.floor((expiresAt.getTime() - ctx.now().getTime()) / 1000),
  );
  store.set(ctx.config.cookieName, token, sessionCookieOptions(ctx, maxAge));
}

export async function clearPracticeSessionCookie(
  ctx: IdentityContext,
): Promise<void> {
  const store = await cookies();
  store.set(ctx.config.cookieName, "", {
    ...sessionCookieOptions(ctx, 0),
    maxAge: 0,
  });
}

export async function readPracticeSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(PRACTICE_SESSION_COOKIE)?.value;
}
