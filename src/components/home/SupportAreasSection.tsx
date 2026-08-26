import Link from "next/link";

import { Container } from "@/components/ui/Container";
import {
  AwarenessIcon,
  FamilyIcon,
  HeartIcon,
  WorkIcon,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { homeSupportAreas, homeSupportAreasIntro } from "@/data/home";
import type { SupportArea } from "@/types/home";

const supportIcons: Record<
  SupportArea["icon"],
  typeof HeartIcon
> = {
  heart: HeartIcon,
  awareness: AwarenessIcon,
  family: FamilyIcon,
  work: WorkIcon,
};

export function SupportAreasSection() {
  return (
    <Section aria-labelledby="home-support-heading">
      <Container>
        <div className="max-w-2xl">
          <h2 id="home-support-heading">{homeSupportAreasIntro.heading}</h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed md:text-lg">
            {homeSupportAreasIntro.description}
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {homeSupportAreas.map((area) => {
            const Icon = supportIcons[area.icon];

            return (
              <li key={area.id}>
                <Link
                  href={area.href}
                  className="border-brand-muted/25 bg-surface hover:border-brand-muted group flex h-full flex-col rounded-[var(--radius-xl)] border p-5 no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none md:p-6"
                >
                  <span className="bg-background text-brand inline-flex h-11 w-11 items-center justify-center rounded-full">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-brand mt-5 font-serif text-xl group-hover:text-[var(--color-brand)]">
                    {area.title}
                  </h3>
                  <p className="text-text-muted mt-3 flex-1 text-sm leading-relaxed md:text-base">
                    {area.description}
                  </p>
                  <span className="text-brand mt-5 text-sm font-medium">
                    Explore this area
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
