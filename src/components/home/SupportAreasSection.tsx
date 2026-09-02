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

        <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
          {homeSupportAreas.map((area) => {
            const Icon = supportIcons[area.icon];

            return (
              <li key={area.id}>
                <Link
                  href={area.href}
                  className="border-brand-muted/20 bg-surface hover:border-brand-muted hover:shadow-[var(--shadow-md)] group flex h-full min-h-[var(--touch-target-min)] flex-col rounded-[var(--radius-xl)] border p-4 no-underline shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-[var(--transition-fast)] motion-reduce:transition-none sm:p-5 md:p-6"
                >
                  <span className="bg-surface-soft text-brand inline-flex h-11 w-11 items-center justify-center rounded-full">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-brand mt-4 font-serif text-xl sm:mt-5">
                    {area.title}
                  </h3>
                  <p className="text-text-muted mt-3 flex-1 text-sm leading-relaxed md:text-base">
                    {area.description}
                  </p>
                  <span className="text-brand mt-4 text-sm font-medium sm:mt-5">
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
