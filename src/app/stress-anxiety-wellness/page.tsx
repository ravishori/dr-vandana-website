import type { Metadata } from "next";

import { AnxietyAwarenessSection } from "@/components/stress-wellness/AnxietyAwarenessSection";
import { BurnoutSection } from "@/components/stress-wellness/BurnoutSection";
import { DepressionAwarenessSection } from "@/components/stress-wellness/DepressionAwarenessSection";
import { EmergencyBoundary } from "@/components/stress-wellness/EmergencyBoundary";
import { HealthyCopingSection } from "@/components/stress-wellness/HealthyCopingSection";
import { MindfulnessSection } from "@/components/stress-wellness/MindfulnessSection";
import { StressEmotionalWellbeing } from "@/components/stress-wellness/StressEmotionalWellbeing";
import { StressUnderstandingSection } from "@/components/stress-wellness/StressUnderstandingSection";
import { StressWellnessCta } from "@/components/stress-wellness/StressWellnessCta";
import { StressWellnessHero } from "@/components/stress-wellness/StressWellnessHero";
import { WhenProfessionalSupportMayHelp } from "@/components/stress-wellness/WhenProfessionalSupportMayHelp";
import { stressWellnessSeo } from "@/data/stress-wellness";

export const metadata: Metadata = {
  title: {
    absolute: stressWellnessSeo.title,
  },
  description: stressWellnessSeo.description,
  alternates: {
    canonical: "/stress-anxiety-wellness",
  },
  openGraph: {
    title: stressWellnessSeo.title,
    description: stressWellnessSeo.description,
    url: "/stress-anxiety-wellness",
  },
};

export default function StressAnxietyWellnessPage() {
  return (
    <>
      <StressWellnessHero />
      <StressUnderstandingSection />
      <StressEmotionalWellbeing />
      <AnxietyAwarenessSection />
      <DepressionAwarenessSection />
      <BurnoutSection />
      <HealthyCopingSection />
      <MindfulnessSection />
      <WhenProfessionalSupportMayHelp />
      <EmergencyBoundary />
      <StressWellnessCta />
    </>
  );
}
