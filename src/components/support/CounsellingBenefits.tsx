import {
  SectionHeading,
  WellnessCard,
  WellnessSection,
} from "@/components/design-system";
import { counsellingBenefits } from "@/data/support";

export function CounsellingBenefits() {
  return (
    <WellnessSection
      aria-labelledby="counselling-benefits-heading"
      tone="soft"
    >
      <SectionHeading
        title={counsellingBenefits.heading}
        titleId="counselling-benefits-heading"
        description={counsellingBenefits.introduction}
        className="mb-8"
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {counsellingBenefits.offerings.map((item) => (
          <WellnessCard
            key={item}
            as="li"
            padding="sm"
            className="border-dashed shadow-none"
          >
            <p className="text-sm text-[var(--color-text)] md:text-base">{item}</p>
          </WellnessCard>
        ))}
      </ul>
    </WellnessSection>
  );
}
