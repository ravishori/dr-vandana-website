import { NextResponse, type NextRequest } from "next/server";

import { doctorPortalConfig } from "@/config/doctor-portal";
import { readSessionToken } from "@/lib/doctor-auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/doctor")) {
    return NextResponse.next();
  }

  if (pathname === "/doctor/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(doctorPortalConfig.cookieName)?.value;
  const session = readSessionToken(token);
  if (!session) {
    const login = new URL("/doctor/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/doctor/:path*"],
};
