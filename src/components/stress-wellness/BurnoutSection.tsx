import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { WorkIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { burnoutSection } from "@/data/stress-wellness";

export function BurnoutSection() {
  return (
    <Section aria-labelledby="burnout-heading">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <span className="bg-surface text-brand border-brand-muted/25 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border">
            <WorkIcon className="h-5 w-5" />
          </span>
          <div className="max-w-3xl">
            <h2 id="burnout-heading">{burnoutSection.heading}</h2>
            <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
              {burnoutSection.lead}
            </p>
          </div>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {burnoutSection.themes.map((theme) => (
            <li
              key={theme.id}
              className="border-brand-muted/25 bg-surface rounded-[var(--radius-lg)] border px-5 py-5"
            >
              <h3 className="font-serif text-xl text-[var(--color-brand)]">
                {theme.title}
              </h3>
              <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
                {theme.description}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <ButtonLink href={burnoutSection.cta.href} variant="secondary">
            {burnoutSection.cta.label}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
