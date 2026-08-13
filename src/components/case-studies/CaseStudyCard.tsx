import Link from "next/link";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/utils";
import type { CaseStudyRecord } from "@/types/ai";

export function CaseStudyCard({
  study,
  className,
}: {
  study: CaseStudyRecord;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "border-brand-muted/30 bg-surface flex h-full flex-col rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <p className="text-text-muted text-sm">{study.ageRange}</p>
      <h2 className="mt-2 text-xl">
        <Link
          href={`/psychology/case-studies/${study.slug}`}
          className="no-underline"
        >
          {study.title}
        </Link>
      </h2>
      <p className="text-text mt-3 flex-1 text-sm leading-relaxed">
        {study.generalContext}
      </p>
      <div className="mt-5">
        <ButtonLink
          href={`/psychology/case-studies/${study.slug}`}
          variant="secondary"
        >
          Read educational scenario
        </ButtonLink>
      </div>
    </article>
  );
}
