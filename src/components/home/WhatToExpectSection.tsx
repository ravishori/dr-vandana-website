import { Container } from "@/components/ui/Container";
import {
  BookIcon,
  ListenIcon,
  PersonIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
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
    <Section
      aria-labelledby="home-expect-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-2xl">
          <h2 id="home-expect-heading">{homeExpectationsIntro.heading}</h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed md:text-lg">
            {homeExpectationsIntro.description}
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {homeExpectations.map((item) => {
            const Icon = expectationIcons[item.icon];

            return (
              <li
                key={item.id}
                className="border-brand-muted/25 bg-background rounded-[var(--radius-xl)] border px-5 py-6"
              >
                <span className="text-brand inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-muted)_25%,white)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-serif text-xl text-[var(--color-brand)]">
                  {item.title}
                </h3>
                <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
                  {item.description}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
