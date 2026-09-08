import Link from "next/link";
import { redirect } from "next/navigation";

import { requireDoctorSession } from "@/lib/doctor-auth";
import { getArticleStats } from "@/lib/articles/service";
import { getCommunicationsStats } from "@/lib/communications/service";

export default async function DoctorDashboardPage() {
  let session;
  try {
    session = await requireDoctorSession();
  } catch {
    redirect("/doctor/login");
  }

  const [articleStats, commStats] = await Promise.all([
    getArticleStats(session),
    getCommunicationsStats(session),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[var(--color-text)]">
          Welcome
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Manage educational articles and website enquiry communications.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="font-[family-name:var(--font-playfair)] text-xl">
            Articles
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
            <li>Total: {articleStats.total}</li>
            <li>Published: {articleStats.published}</li>
            <li>Drafts: {articleStats.draft}</li>
            <li>Archived: {articleStats.archived}</li>
          </ul>
          <div className="mt-4 flex gap-3 text-sm">
            <Link href="/doctor/articles" className="text-[var(--color-brand)] hover:underline">
              View articles
            </Link>
            <Link href="/doctor/articles/new" className="text-[var(--color-brand)] hover:underline">
              New article
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="font-[family-name:var(--font-playfair)] text-xl">
            Communications
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
            <li>Total: {commStats.total}</li>
            <li>New: {commStats.newCount}</li>
            <li>Awaiting reply: {commStats.awaitingReply}</li>
            <li>Replied: {commStats.replied}</li>
          </ul>
          <div className="mt-4">
            <Link
              href="/doctor/communications"
              className="text-sm text-[var(--color-brand)] hover:underline"
            >
              Open inbox
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
