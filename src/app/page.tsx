import type { Metadata } from "next";

import { ChildAdolescentHighlight } from "@/components/home/ChildAdolescentHighlight";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeCta } from "@/components/home/HomeCta";
import { PhilosophySection } from "@/components/home/PhilosophySection";
import { ProfessionalHighlights } from "@/components/home/ProfessionalHighlights";
import { StressWellnessHighlight } from "@/components/home/StressWellnessHighlight";
import { SupportAreasSection } from "@/components/home/SupportAreasSection";
import { WhatToExpectSection } from "@/components/home/WhatToExpectSection";
import { homeSeo } from "@/data/home";

export const metadata: Metadata = {
  title: {
    absolute: homeSeo.title,
  },
  description: homeSeo.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homeSeo.title,
    description: homeSeo.description,
    url: "/",
  },
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProfessionalHighlights />
      <PhilosophySection />
      <SupportAreasSection />
      <ChildAdolescentHighlight />
      <StressWellnessHighlight />
      <WhatToExpectSection />
      <HomeCta />
    </>
  );
}
