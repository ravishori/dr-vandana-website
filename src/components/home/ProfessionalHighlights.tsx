import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { homeHighlights } from "@/data/home";

export function ProfessionalHighlights() {
  return (
    <Section
      aria-labelledby="home-highlights-heading"
      className="py-8 sm:py-10 md:py-12"
    >
      <Container>
        <h2 id="home-highlights-heading" className="sr-only">
          Professional highlights
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
          {homeHighlights.map((item) => (
            <li
              key={item.id}
              className="border-brand-muted/20 bg-surface rounded-[var(--radius-lg)] border px-3 py-4 text-center shadow-[var(--shadow-sm)] sm:px-4 sm:py-5 md:px-5"
            >
              <p className="font-serif text-[clamp(1.35rem,3vw,1.75rem)] text-[var(--color-brand)]">
                {item.value}
              </p>
              <p className="text-text-muted mt-2 text-xs leading-snug sm:text-sm">
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
