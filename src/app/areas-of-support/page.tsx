import type { Metadata } from "next";

import { ChildAdolescentTeaser } from "@/components/support/ChildAdolescentTeaser";
import { CounsellingBenefits } from "@/components/support/CounsellingBenefits";
import { EmotionalWellbeingSection } from "@/components/support/EmotionalWellbeingSection";
import { MentalHealthSupportSection } from "@/components/support/MentalHealthSupportSection";
import { RelationshipsFamilySection } from "@/components/support/RelationshipsFamilySection";
import { SupportCta } from "@/components/support/SupportCta";
import { SupportHero } from "@/components/support/SupportHero";
import { WhenSupportMayHelp } from "@/components/support/WhenSupportMayHelp";
import { WorkplaceWellbeingSection } from "@/components/support/WorkplaceWellbeingSection";
import { supportSeo } from "@/data/support";

export const metadata: Metadata = {
  title: {
    absolute: supportSeo.title,
  },
  description: supportSeo.description,
  alternates: {
    canonical: "/areas-of-support",
  },
  openGraph: {
    title: supportSeo.title,
    description: supportSeo.description,
    url: "/areas-of-support",
  },
};

export default function AreasOfSupportPage() {
  return (
    <>
      <SupportHero />
      <EmotionalWellbeingSection />
      <MentalHealthSupportSection />
      <RelationshipsFamilySection />
      <WorkplaceWellbeingSection />
      <ChildAdolescentTeaser />
      <WhenSupportMayHelp />
      <CounsellingBenefits />
      <SupportCta />
    </>
  );
}
