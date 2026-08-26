import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { homeHighlights } from "@/data/home";

export function ProfessionalHighlights() {
  return (
    <Section
      aria-labelledby="home-highlights-heading"
      className="py-10 md:py-12"
    >
      <Container>
        <h2 id="home-highlights-heading" className="sr-only">
          Professional highlights
        </h2>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {homeHighlights.map((item) => (
            <li
              key={item.id}
              className="border-brand-muted/25 bg-surface rounded-[var(--radius-lg)] border px-4 py-5 text-center md:px-5"
            >
              <p className="font-serif text-2xl text-[var(--color-brand)] md:text-[1.75rem]">
                {item.value}
              </p>
              <p className="text-text-muted mt-2 text-sm leading-snug">
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
