import { Container } from "@/components/ui/Container";
import {
  BookIcon,
  HeartIcon,
  PersonIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
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
    <Section aria-labelledby="about-values-heading">
      <Container>
        <div className="max-w-2xl">
          <h2 id="about-values-heading">Professional values</h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed md:text-lg">
            These values guide the tone and boundaries of professional
            psychological support.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {aboutValues.map((value) => {
            const Icon = valueIcons[value.icon];

            return (
              <li
                key={value.id}
                className="border-brand-muted/25 bg-surface rounded-[var(--radius-xl)] border px-5 py-6"
              >
                <span className="text-brand inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-muted)_25%,white)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-serif text-xl text-[var(--color-brand)]">
                  {value.title}
                </h3>
                <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
                  {value.description}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
