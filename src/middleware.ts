import { NextResponse, type NextRequest } from "next/server";

import { questionPortalConfig } from "@/config/question-portal";
import { readSessionToken } from "@/lib/question-portal/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/psychologist/:path*"],
};
