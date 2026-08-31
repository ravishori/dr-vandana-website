import Link from "next/link";
import { redirect } from "next/navigation";

import { practiceLogoutAction } from "@/app/practice-auth/actions";
import { loadPracticeDashboard } from "@/app/psychologist/practice/actions";
import { PracticeNav } from "@/components/practice/PracticeNav";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { identityButtonClassName } from "@/components/identity/IdentityShell";

export default async function PsychologistPracticeHomePage() {
  const dashboard = await loadPracticeDashboard();
  if (!dashboard.ok) {
    redirect("/psychologist/practice/login");
  }
  const { summary } = dashboard;

  return (
    <Section className="pt-12 md:pt-16">
      <Container>
        <PracticeNav current="/psychologist/practice" />
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Practice
        </p>
        <h1 className="mt-4">Practice dashboard</h1>
        <p className="text-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Operational overview only. Clinical notes are not part of this
          workspace.
        </p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Today",
              value: summary.today,
              href: "/psychologist/practice/appointments?filter=today",
            },
            {
              label: "Upcoming",
              value: summary.upcoming,
              href: "/psychologist/practice/appointments?filter=upcoming",
            },
            {
              label: "Pending review",
              value: summary.pending,
              href: "/psychologist/practice/appointments?filter=pending",
            },
            {
              label: "Patients",
              value: summary.patients,
              href: "/psychologist/practice/patients",
            },
            {
              label: "Completed",
              value: summary.completed,
              href: "/psychologist/practice/appointments?filter=completed",
            },
            {
              label: "Cancelled",
              value: summary.cancelled,
              href: "/psychologist/practice/appointments?filter=cancelled",
            },
            {
              label: "No-show",
              value: summary.noShow,
              href: "/psychologist/practice/appointments?filter=no_show",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="border-brand-muted/30 rounded-lg border p-4"
            >
              <dt className="text-text-muted text-sm">{item.label}</dt>
              <dd className="mt-2 text-3xl font-medium tracking-tight">
                <Link href={item.href} className="hover:underline">
                  {item.value}
                </Link>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link className="underline" href="/psychologist/practice/appointments">
            Manage appointments
          </Link>
          <Link className="underline" href="/psychologist/practice/patients">
            Patient directory
          </Link>
          <Link className="underline" href="/psychologist/practice/settings">
            Practice settings
          </Link>
        </div>
        <p className="text-text-muted mt-6 max-w-2xl text-sm">
          Public appointment enquiries are delivered by email and are not listed
          here until an enquiry-management table is approved.
        </p>
        <form
          className="mt-10"
          action={async () => {
            "use server";
            await practiceLogoutAction("/psychologist/practice/login");
          }}
        >
          <button type="submit" className={identityButtonClassName}>
            Sign out
          </button>
        </form>
      </Container>
    </Section>
  );
}
