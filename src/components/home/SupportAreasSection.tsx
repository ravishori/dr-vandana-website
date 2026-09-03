import {
  SectionHeading,
  SupportCard,
  WellnessSection,
} from "@/components/design-system";
import {
  AwarenessIcon,
  FamilyIcon,
  HeartIcon,
  WorkIcon,
} from "@/components/ui/icons";
import { homeSupportAreas, homeSupportAreasIntro } from "@/data/home";
import type { SupportArea } from "@/types/home";

const supportIcons: Record<SupportArea["icon"], typeof HeartIcon> = {
  heart: HeartIcon,
  awareness: AwarenessIcon,
  family: FamilyIcon,
  work: WorkIcon,
};

export function SupportAreasSection() {
  return (
    <WellnessSection aria-labelledby="home-support-heading">
      <SectionHeading
        title={homeSupportAreasIntro.heading}
        titleId="home-support-heading"
        description={homeSupportAreasIntro.description}
        className="max-w-2xl"
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {homeSupportAreas.map((area) => (
          <li key={area.id} className="h-full">
            <SupportCard
              title={area.title}
              description={area.description}
              href={area.href}
              icon={supportIcons[area.icon]}
              ctaLabel="Explore this area"
            />
          </li>
        ))}
      </ul>
    </WellnessSection>
  );
}
