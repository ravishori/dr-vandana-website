import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import {
  AwarenessIcon,
  FamilyIcon,
  HeartIcon,
  WorkIcon,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/utils";
import type { SupportAreaDetail } from "@/types/support";

const areaIcons = {
  heart: HeartIcon,
  awareness: AwarenessIcon,
  family: FamilyIcon,
  work: WorkIcon,
} as const;

type SupportAreaBlockProps = {
  area: SupportAreaDetail;
  tone?: "default" | "muted";
};

export function SupportAreaBlock({
  area,
  tone = "default",
}: SupportAreaBlockProps) {
  const Icon = areaIcons[area.icon];
  const headingId = `${area.id}-heading`;

  return (
    <Section
      id={area.id}
      aria-labelledby={headingId}
      className={cn(tone === "muted" && "bg-surface/70")}
    >
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <span className="bg-surface text-brand border-brand-muted/25 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border">
            <Icon className="h-5 w-5" />
          </span>
          <div className="max-w-3xl">
            <h2 id={headingId}>{area.heading}</h2>
            <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
              {area.introduction}
            </p>
          </div>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {area.topics.map((topic) => (
            <li
              key={topic.id}
              className={cn(
                "border-brand-muted/20 rounded-[var(--radius-lg)] border px-4 py-5 shadow-[var(--shadow-sm)] md:px-5",
                tone === "muted" ? "bg-background" : "bg-surface",
              )}
            >
              <h3 className="font-serif text-lg text-[var(--color-brand)] md:text-xl">
                {topic.title}
              </h3>
              <p className="text-text-muted mt-2 text-sm leading-relaxed md:text-base">
                {topic.description}
              </p>
            </li>
          ))}
        </ul>

        {area.closingNote ? (
          <p className="text-text-muted mt-6 max-w-3xl text-sm leading-relaxed">
            {area.closingNote}
          </p>
        ) : null}

        {area.cta ? (
          <div className="mt-8">
            <ButtonLink href={area.cta.href} variant="secondary">
              {area.cta.label}
            </ButtonLink>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
