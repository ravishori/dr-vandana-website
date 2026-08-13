import Link from "next/link";
import { redirect } from "next/navigation";

import { flagOverdueCrisisResourcesAction } from "@/app/psychologist/crisis/actions";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { crisisCategoryLabels } from "@/data/crisis/seed";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import { verificationDueState } from "@/lib/crisis/schema";
import {
  getCrisisStats,
  listAdminCrisisResources,
} from "@/lib/crisis/service";

export const dynamic = "force-dynamic";

export default async function PsychologistCrisisPage() {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }

  const [stats, resources] = await Promise.all([
    getCrisisStats(session),
    listAdminCrisisResources(session),
  ]);

  const summary = [
    { label: "Verified", value: stats.verified },
    { label: "Needs review", value: stats.needsReview },
    { label: "Overdue / due today", value: stats.overdue },
    { label: "Inactive", value: stats.inactive },
    { label: "Archived", value: stats.archived },
  ];

  const verificationQueue = resources.filter((resource) => {
    const due = verificationDueState(resource.nextVerificationDueAt);
    return (
      resource.verificationStatus === "NEEDS_REVIEW" ||
      due === "overdue" ||
      due === "due_today" ||
      due === "due_soon"
    );
  });

  return (
    <Section className="pt-10">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1>Emergency &amp; mental health resources</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">
              Manage source-verified crisis and helpline records. Only VERIFIED
              and active resources appear on the public support page. Phone
              numbers and source URLs require psychologist authorization.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={flagOverdueCrisisResourcesAction}>
              <button
                type="submit"
                className="border-brand-muted rounded-[var(--radius-md)] border px-4 py-2 text-sm"
              >
                Flag overdue as needs review
              </button>
            </form>
            <ButtonLink href="/psychologist/crisis/new">Add resource</ButtonLink>
          </div>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summary.map((item) => (
            <li
              key={item.label}
              className="border-brand-muted/30 bg-surface rounded-[var(--radius-lg)] border p-4"
            >
              <p className="text-text-muted text-sm">{item.label}</p>
              <p className="text-brand mt-2 font-serif text-3xl">{item.value}</p>
            </li>
          ))}
        </ul>

        {verificationQueue.length > 0 ? (
          <div className="border-brand-muted/40 bg-surface-soft mt-8 rounded-[var(--radius-lg)] border p-5">
            <h2 className="text-lg">Verification required</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {verificationQueue.map((resource) => (
                <li key={resource.id}>
                  <Link href={`/psychologist/crisis/${resource.slug}`}>
                    {resource.name}
                  </Link>{" "}
                  · {resource.verificationStatus} · due{" "}
                  {resource.nextVerificationDueAt}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="text-text-muted border-b">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Active</th>
                <th className="py-2 font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((item) => (
                <tr key={item.id} className="border-b border-brand-muted/20">
                  <td className="py-3 pr-3">{item.name}</td>
                  <td className="py-3 pr-3">
                    {crisisCategoryLabels[item.category]}
                  </td>
                  <td className="py-3 pr-3">{item.verificationStatus}</td>
                  <td className="py-3 pr-3">{item.isActive ? "Yes" : "No"}</td>
                  <td className="py-3">
                    <Link href={`/psychologist/crisis/${item.slug}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}
