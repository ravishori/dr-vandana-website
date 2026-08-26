import Link from "next/link";
import type { ReactNode } from "react";

import { logoutContentAdminAction } from "@/app/admin/content/actions";
import { getContentAdminSession } from "@/lib/cms/auth";

const nav = [
  { href: "/admin/content", label: "Dashboard" },
  { href: "/admin/content/articles", label: "Articles" },
  { href: "/admin/content/resources", label: "Resources" },
  { href: "/admin/content/videos", label: "Videos" },
] as const;

export default async function AdminContentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getContentAdminSession();

  return (
    <div className="min-h-[70vh] bg-background text-text">
      <header className="mb-8 border-b border-brand-muted/30 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-wide text-brand uppercase">
              Content management
            </p>
            <p className="font-semibold">
              {session ? session.email : "Admin sign-in"}
            </p>
          </div>
          {session ? (
            <nav
              className="flex flex-wrap items-center gap-4 text-sm"
              aria-label="Admin content"
            >
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              ))}
              <Link href="/blog" className="text-text-muted hover:underline">
                View site
              </Link>
              <form action={logoutContentAdminAction}>
                <button type="submit" className="underline underline-offset-2">
                  Sign out
                </button>
              </form>
            </nav>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}
