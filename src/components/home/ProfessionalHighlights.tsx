import { WellnessCard, WellnessSection } from "@/components/design-system";
import { homeHighlights } from "@/data/home";

export function ProfessionalHighlights() {
  return (
    <WellnessSection
      aria-labelledby="home-highlights-heading"
      className="py-10 md:py-12"
    >
      <h2 id="home-highlights-heading" className="sr-only">
        Professional highlights
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {homeHighlights.map((item) => (
          <WellnessCard
            key={item.id}
            as="li"
            padding="sm"
            className="shadow-none text-center"
          >
            <p className="font-serif text-2xl text-[var(--color-brand)] md:text-[1.75rem]">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-snug text-[var(--color-text-muted)]">
              {item.label}
            </p>
          </WellnessCard>
        ))}
      </ul>
    </WellnessSection>
  );
}
