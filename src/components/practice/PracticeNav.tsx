import Link from "next/link";

import { practiceLogoutAction } from "@/app/practice-auth/actions";

const LINKS = [
  { href: "/psychologist/practice", label: "Dashboard" },
  { href: "/psychologist/practice/appointments", label: "Appointments" },
  { href: "/psychologist/practice/patients", label: "Patients" },
  { href: "/psychologist/practice/settings", label: "Settings" },
] as const;

export function PracticeNav({ current }: { current?: string }) {
  return (
    <nav
      aria-label="Practice management"
      className="border-brand-muted/30 mb-8 flex flex-wrap items-center gap-2 border-b pb-4"
    >
      {LINKS.map((link) => {
        const active =
          current === link.href ||
          (link.href !== "/psychologist/practice" &&
            current?.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "bg-brand text-background rounded-full px-3 py-1.5 text-sm"
                : "border-brand-muted/40 text-text rounded-full border px-3 py-1.5 text-sm"
            }
          >
            {link.label}
          </Link>
        );
      })}
      <form
        className="ml-auto"
        action={async () => {
          "use server";
          await practiceLogoutAction("/psychologist/practice/login");
        }}
      >
        <button
          type="submit"
          className="border-brand-muted/40 text-text rounded-full border px-3 py-1.5 text-sm"
        >
          Sign out
        </button>
      </form>
    </nav>
  );
}
