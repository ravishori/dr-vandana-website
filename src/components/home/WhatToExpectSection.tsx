import {
  SectionHeading,
  WellnessCard,
  WellnessSection,
} from "@/components/design-system";
import {
  BookIcon,
  ListenIcon,
  PersonIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { homeExpectations, homeExpectationsIntro } from "@/data/home";
import type { ExpectationItem } from "@/types/home";

const expectationIcons: Record<
  ExpectationItem["icon"],
  typeof ListenIcon
> = {
  listen: ListenIcon,
  shield: ShieldIcon,
  person: PersonIcon,
  book: BookIcon,
};

export function WhatToExpectSection() {
  return (
    <WellnessSection
      aria-labelledby="home-expect-heading"
      tone="soft"
    >
      <SectionHeading
        title={homeExpectationsIntro.heading}
        titleId="home-expect-heading"
        description={homeExpectationsIntro.description}
        className="max-w-2xl"
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {homeExpectations.map((item) => {
          const Icon = expectationIcons[item.icon];

          return (
            <WellnessCard
              key={item.id}
              as="li"
              padding="md"
              className="shadow-none bg-[var(--color-background)]"
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-muted)_25%,white)] text-[var(--color-brand)]"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[var(--color-brand)]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)] md:text-base">
                {item.description}
              </p>
            </WellnessCard>
          );
        })}
      </ul>
    </WellnessSection>
  );
}
