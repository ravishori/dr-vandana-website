import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { teenWellbeing } from "@/data/child-adolescent";

export function TeenWellbeingSection() {
  return (
    <Section aria-labelledby="teen-wellbeing-heading">
      <Container>
        <div className="max-w-3xl">
          <h2 id="teen-wellbeing-heading">{teenWellbeing.heading}</h2>
          <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
            {teenWellbeing.lead}
          </p>
        </div>

        <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {teenWellbeing.themes.map((theme) => (
            <li key={theme.title} className="max-w-md">
              <h3 className="font-serif text-xl text-[var(--color-brand)]">
                {theme.title}
              </h3>
              <p className="text-text-muted mt-2 text-sm leading-relaxed md:text-base">
                {theme.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
