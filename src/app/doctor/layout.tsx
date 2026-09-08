import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DoctorLogoutButton } from "@/components/doctor/DoctorLogoutButton";
import { communicationsPortalDisclaimer } from "@/config/doctor-portal";
import { getDoctorSession } from "@/lib/doctor-auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DoctorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getDoctorSession();

  return (
    <div className="min-h-[70vh] bg-[var(--color-background)]">
      {session ? (
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div>
              <p className="font-[family-name:var(--font-playfair)] text-lg text-[var(--color-text)]">
                Doctor portal
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {session.email}
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href="/doctor/dashboard"
                className="text-[var(--color-brand)] hover:underline"
              >
                Dashboard
              </Link>
              <Link
                href="/doctor/articles"
                className="text-[var(--color-brand)] hover:underline"
              >
                Articles
              </Link>
              <Link
                href="/doctor/communications"
                className="text-[var(--color-brand)] hover:underline"
              >
                Communications
              </Link>
              <DoctorLogoutButton />
            </nav>
          </div>
          <p className="mx-auto max-w-6xl px-4 pb-3 text-xs text-[var(--color-text-muted)] sm:px-6">
            {communicationsPortalDisclaimer}
          </p>
        </header>
      ) : null}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
