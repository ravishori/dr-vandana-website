import {
  SectionHeading,
  WellnessCard,
  WellnessSection,
} from "@/components/design-system";
import {
  BookIcon,
  HeartIcon,
  PersonIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { aboutValues } from "@/data/about";
import type { AboutValue } from "@/types/about";

const valueIcons: Record<AboutValue["icon"], typeof HeartIcon> = {
  empathy: HeartIcon,
  respect: PersonIcon,
  confidentiality: ShieldIcon,
  evidence: BookIcon,
};

export function ProfessionalValues() {
  return (
    <WellnessSection aria-labelledby="about-values-heading">
      <SectionHeading
        title="Professional values"
        titleId="about-values-heading"
        description="These values guide the tone and boundaries of professional psychological support."
        className="max-w-2xl"
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {aboutValues.map((value) => {
          const Icon = valueIcons[value.icon];

          return (
            <WellnessCard
              key={value.id}
              as="li"
              padding="md"
              className="shadow-none"
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-muted)_25%,white)] text-[var(--color-brand)]"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[var(--color-brand)]">
                {value.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)] md:text-base">
                {value.description}
              </p>
            </WellnessCard>
          );
        })}
      </ul>
    </WellnessSection>
  );
}
