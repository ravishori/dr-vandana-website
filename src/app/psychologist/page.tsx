import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import { getQuestionStats } from "@/lib/question-portal/service";
import { getCrisisStats } from "@/lib/crisis/service";

export const dynamic = "force-dynamic";

export default async function PsychologistDashboardPage() {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }
  const [stats, crisisStats] = await Promise.all([
    getQuestionStats(session),
    getCrisisStats(session),
  ]);

  const cards = [
    { label: "New questions", value: stats.newCount, href: "/psychologist/questions?status=NEW" },
    {
      label: "Under review",
      value: stats.underReviewCount,
      href: "/psychologist/questions?status=UNDER_REVIEW",
    },
    {
      label: "Draft responses",
      value: stats.draftResponseCount,
      href: "/psychologist/questions?status=DRAFT_RESPONSE",
    },
    {
      label: "Responded",
      value: stats.respondedCount,
      href: "/psychologist/questions?status=RESPONDED",
    },
    {
      label: "Archived",
      value: stats.archivedCount,
      href: "/psychologist/questions?status=ARCHIVED",
    },
  ];

  const crisisCards = [
    {
      label: "Crisis verified",
      value: crisisStats.verified,
      href: "/psychologist/crisis",
    },
    {
      label: "Crisis needs review",
      value: crisisStats.needsReview,
      href: "/psychologist/crisis",
    },
    {
      label: "Crisis overdue",
      value: crisisStats.overdue,
      href: "/psychologist/crisis",
    },
  ];

  return (
    <Section className="pt-10">
      <Container>
        <h1>Review dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          Private submissions stay in this portal. Educational Ask AI answers are
          separate and are never sent as clinical replies without your review.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <li key={card.label}>
              <Link
                href={card.href}
                className="border-brand-muted/30 bg-surface block rounded-[var(--radius-lg)] border p-4 no-underline shadow-[var(--shadow-sm)]"
              >
                <p className="text-text-muted text-sm">{card.label}</p>
                <p className="text-brand mt-2 font-serif text-3xl">{card.value}</p>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-xl">Emergency resources</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {crisisCards.map((card) => (
            <li key={card.label}>
              <Link
                href={card.href}
                className="border-brand-muted/30 bg-surface block rounded-[var(--radius-lg)] border p-4 no-underline shadow-[var(--shadow-sm)]"
              >
                <p className="text-text-muted text-sm">{card.label}</p>
                <p className="text-brand mt-2 font-serif text-3xl">{card.value}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
