import type { Metadata } from "next";

import { AboutCta } from "@/components/about/AboutCta";
import { AboutHero } from "@/components/about/AboutHero";
import { ExperienceSection } from "@/components/about/ExperienceSection";
import { HolisticWellnessSection } from "@/components/about/HolisticWellnessSection";
import { ProfessionalApproach } from "@/components/about/ProfessionalApproach";
import { ProfessionalIntroduction } from "@/components/about/ProfessionalIntroduction";
import { ProfessionalValues } from "@/components/about/ProfessionalValues";
import { QualificationsSection } from "@/components/about/QualificationsSection";
import { aboutSeo } from "@/data/about";

export const metadata: Metadata = {
  title: {
    absolute: aboutSeo.title,
  },
  description: aboutSeo.description,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: aboutSeo.title,
    description: aboutSeo.description,
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <ProfessionalIntroduction />
      <QualificationsSection />
      <ExperienceSection />
      <ProfessionalApproach />
      <ProfessionalValues />
      <HolisticWellnessSection />
      <AboutCta />
    </>
  );
}
