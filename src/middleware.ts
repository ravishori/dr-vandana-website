import { NextResponse, type NextRequest } from "next/server";

import { practiceConfig } from "@/config/practice";
import { questionPortalConfig } from "@/config/question-portal";
import { readPracticeSessionToken } from "@/lib/practice/session";
import { readSessionToken } from "@/lib/question-portal/session";

const PATIENT_PUBLIC_PATHS = new Set([
  "/patient",
  "/patient/login",
  "/patient/register",
  "/patient/verify",
  "/patient/verify-email",
  "/patient/forgot-password",
  "/patient/reset-password",
]);

function isPatientPublicPath(pathname: string): boolean {
  if (PATIENT_PUBLIC_PATHS.has(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/patient")) {
    if (isPatientPublicPath(pathname)) {
      return NextResponse.next();
    }
    const practiceToken = request.cookies.get(practiceConfig.cookieName)?.value;
    const practiceSession = await readPracticeSessionToken(practiceToken);
    if (!practiceSession || practiceSession.role !== "PATIENT") {
      const login = new URL("/patient/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/psychologist/practice")) {
    const practiceToken = request.cookies.get(practiceConfig.cookieName)?.value;
    const practiceSession = await readPracticeSessionToken(practiceToken);
    if (!practiceSession || practiceSession.role !== "PSYCHOLOGIST") {
      const login = new URL("/patient/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }
    if (
      practiceSession.mfaVerified === false &&
      pathname !== "/psychologist/practice/mfa" &&
      pathname !== "/psychologist/practice/security"
    ) {
      return NextResponse.redirect(
        new URL("/psychologist/practice/mfa", request.url),
      );
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/psychologist")) {
    return NextResponse.next();
  }
  if (pathname === "/psychologist/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(questionPortalConfig.cookieName)?.value;
  const session = await readSessionToken(token);
  if (!session) {
    const login = new URL("/psychologist/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/psychologist/:path*", "/patient/:path*"],
};
