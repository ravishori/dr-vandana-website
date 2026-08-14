import { NextResponse, type NextRequest } from "next/server";

import { questionPortalConfig } from "@/config/question-portal";
import { PRACTICE_SESSION_COOKIE } from "@/lib/identity/constants";
import { readSessionToken } from "@/lib/question-portal/session";

const PATIENT_PUBLIC_PREFIXES = [
  "/patient/register",
  "/patient/login",
  "/patient/verify-email",
  "/patient/verify-phone",
  "/patient/forgot-password",
  "/patient/reset-password",
];

function withPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function nextPrivate(): NextResponse {
  return withPrivateHeaders(NextResponse.next());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/patient")) {
    const isPublic = PATIENT_PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (isPublic) {
      return nextPrivate();
    }
    const token = request.cookies.get(PRACTICE_SESSION_COOKIE)?.value;
    if (!token) {
      const login = new URL("/patient/login", request.url);
      return withPrivateHeaders(NextResponse.redirect(login));
    }
    return nextPrivate();
  }

  if (pathname.startsWith("/super-admin")) {
    if (pathname === "/super-admin/login") {
      return nextPrivate();
    }
    const token = request.cookies.get(PRACTICE_SESSION_COOKIE)?.value;
    if (!token) {
      return withPrivateHeaders(
        NextResponse.redirect(new URL("/super-admin/login", request.url)),
      );
    }
    return nextPrivate();
  }

  if (!pathname.startsWith("/psychologist")) {
    return NextResponse.next();
  }

  if (pathname === "/psychologist/login") {
    return nextPrivate();
  }

  if (pathname === "/psychologist/practice/login") {
    return nextPrivate();
  }

  if (pathname.startsWith("/psychologist/practice")) {
    const token = request.cookies.get(PRACTICE_SESSION_COOKIE)?.value;
    if (!token) {
      return withPrivateHeaders(
        NextResponse.redirect(
          new URL("/psychologist/practice/login", request.url),
        ),
      );
    }
    return nextPrivate();
  }

  const token = request.cookies.get(questionPortalConfig.cookieName)?.value;
  const session = await readSessionToken(token);
  if (!session) {
    const login = new URL("/psychologist/login", request.url);
    login.searchParams.set("from", pathname);
    return withPrivateHeaders(NextResponse.redirect(login));
  }
  return nextPrivate();
}

export const config = {
  matcher: ["/psychologist/:path*", "/patient/:path*", "/super-admin/:path*"],
};
