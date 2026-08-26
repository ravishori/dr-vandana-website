import type { Metadata } from "next";

import { ChildAdolescentCta } from "@/components/child-adolescent/ChildAdolescentCta";
import { ChildAdolescentHero } from "@/components/child-adolescent/ChildAdolescentHero";
import { CommonConcernsSection } from "@/components/child-adolescent/CommonConcernsSection";
import { DevelopmentSection } from "@/components/child-adolescent/DevelopmentSection";
import { ParentExpectationsSection } from "@/components/child-adolescent/ParentExpectationsSection";
import { ParentGuidanceSection } from "@/components/child-adolescent/ParentGuidanceSection";
import { TeenWellbeingSection } from "@/components/child-adolescent/TeenWellbeingSection";
import { WhenProfessionalGuidanceMayHelp } from "@/components/child-adolescent/WhenProfessionalGuidanceMayHelp";
import { EmergencyBoundary } from "@/components/stress-wellness/EmergencyBoundary";
import { childAdolescentSeo } from "@/data/child-adolescent";

export const metadata: Metadata = {
  title: {
    absolute: childAdolescentSeo.title,
  },
  description: childAdolescentSeo.description,
  alternates: {
    canonical: "/child-adolescent-psychology",
  },
  openGraph: {
    title: childAdolescentSeo.title,
    description: childAdolescentSeo.description,
    url: "/child-adolescent-psychology",
  },
};

export default function ChildAdolescentPsychologyPage() {
  return (
    <>
      <ChildAdolescentHero />
      <DevelopmentSection />
      <CommonConcernsSection />
      <TeenWellbeingSection />
      <ParentGuidanceSection />
      <WhenProfessionalGuidanceMayHelp />
      <ParentExpectationsSection />
      <EmergencyBoundary />
      <ChildAdolescentCta />
    </>
  );
}
