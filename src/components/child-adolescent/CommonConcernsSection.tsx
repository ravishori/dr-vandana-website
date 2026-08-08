import { Container } from "@/components/ui/Container";
import {
  AwarenessIcon,
  BookIcon,
  FamilyIcon,
  HeartIcon,
  PersonIcon,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import {
  commonConcerns,
  commonConcernsIntro,
} from "@/data/child-adolescent";
import type { ConcernCard } from "@/types/child-adolescent";

const concernIcons: Record<ConcernCard["icon"], typeof HeartIcon> = {
  academic: BookIcon,
  emotional: HeartIcon,
  behavioural: AwarenessIcon,
  peer: FamilyIcon,
  confidence: PersonIcon,
};

export function CommonConcernsSection() {
  return (
    <Section
      aria-labelledby="common-concerns-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-2xl">
          <h2 id="common-concerns-heading">{commonConcernsIntro.heading}</h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed md:text-lg">
            {commonConcernsIntro.description}
          </p>
        </div>

        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {commonConcerns.map((concern) => {
            const Icon = concernIcons[concern.icon];

            return (
              <li
                key={concern.id}
                className="border-brand-muted/25 bg-background rounded-[var(--radius-xl)] border px-5 py-6"
              >
                <span className="text-brand inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-muted)_25%,white)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-serif text-xl text-[var(--color-brand)]">
                  {concern.title}
                </h3>
                <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
                  {concern.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {concern.points.map((point) => (
                    <li
                      key={point}
                      className="text-text flex items-start gap-2 text-sm leading-relaxed"
                    >
                      <span
                        className="bg-brand-muted/50 mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                        aria-hidden="true"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
