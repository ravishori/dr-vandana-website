import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { counsellingBenefits } from "@/data/support";

export function CounsellingBenefits() {
  return (
    <Section
      aria-labelledby="counselling-benefits-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-2xl">
          <h2 id="counselling-benefits-heading">
            {counsellingBenefits.heading}
          </h2>
          <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
            {counsellingBenefits.introduction}
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {counsellingBenefits.offerings.map((item) => (
            <li
              key={item}
              className="border-brand-muted/30 text-text rounded-[var(--radius-md)] border border-dashed px-4 py-3 text-sm md:text-base"
            >
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
