import {
  SectionHeading,
  WellnessSection,
} from "@/components/design-system";
import { whenSupportMayHelp } from "@/data/support";

export function WhenSupportMayHelp() {
  return (
    <WellnessSection
      aria-labelledby="when-support-may-help-heading"
      containerClassName="max-w-3xl"
    >
      <SectionHeading
        title={whenSupportMayHelp.heading}
        titleId="when-support-may-help-heading"
        description={whenSupportMayHelp.introduction}
        className="mb-6"
      />
      <ul className="space-y-3">
        {whenSupportMayHelp.points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 text-base leading-relaxed text-[var(--color-text)]"
          >
            <span
              className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-brand-muted)_50%,transparent)]"
              aria-hidden="true"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm leading-relaxed text-[var(--color-text-muted)] md:text-base">
        {whenSupportMayHelp.closingNote}
      </p>
    </WellnessSection>
  );
}
