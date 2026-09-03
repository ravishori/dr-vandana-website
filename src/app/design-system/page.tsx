import type { Metadata } from "next";

import {
  AIWellnessCard,
  AppointmentCard,
  ResourceCard,
  SectionHeading,
  StatusNotice,
  SupportCard,
  TestimonialCard,
  WellnessButton,
  WellnessCard,
  WellnessFaq,
  WellnessSection,
} from "@/components/design-system";
import {
  BookIcon,
  HeartIcon,
  LeafIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import { designSystemMeta } from "@/design-system";

export const metadata: Metadata = {
  title: "Design System",
  description:
    "Internal showcase for the Dr. Vandana Wellness Design System V1.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/design-system",
  },
};

const faqItems = [
  {
    id: "faq-sessions",
    question: "What happens in a first consultation?",
    answer:
      "The first session focuses on understanding your concerns in a confidential, respectful setting. It is not a diagnosis appointment and proceeds at a pace that feels safe.",
  },
  {
    id: "faq-ai",
    question: "Is Ask Dr. Vandana AI a substitute for counselling?",
    answer:
      "No. The AI assistant provides educational mental-wellness information only. It does not diagnose, prescribe, or replace professional care.",
  },
  {
    id: "faq-emergency",
    question: "What should I do in a mental-health emergency?",
    answer:
      "If you or someone else is in immediate danger, contact local emergency services or a trusted crisis helpline right away. This website is not an emergency service.",
  },
];

export default function DesignSystemPage() {
  return (
    <>
      <WellnessSection
        tone="brand-soft"
        aria-labelledby="ds-hero-title"
      >
        <SectionHeading
          titleId="ds-hero-title"
          titleAs="h1"
          eyebrow={`${designSystemMeta.name} v${designSystemMeta.version}`}
          title="Calm, consistent building blocks"
          description="A reusable design language for Dr. Vandana’s psychology practice — accessible, professional, and emotionally safe. Smart Wellness Navigation V2 and desktop navigation are intentionally unchanged."
          actions={
            <>
              <WellnessButton href="/book-appointment" variant="primary">
                Book an Appointment
              </WellnessButton>
              <WellnessButton
                href="/psychology/ask-dr-vandana-ai"
                variant="ai"
              >
                Ask Dr. Vandana AI
              </WellnessButton>
            </>
          }
        />
        <StatusNotice title="Developer showcase" tone="info">
          This route is <strong>noindex</strong>. Prefer existing components
          first, then these wellness primitives. Do not invent routes or
          clinical claims when composing new UI.
        </StatusNotice>
      </WellnessSection>

      <WellnessSection aria-labelledby="ds-buttons-title">
        <SectionHeading
          titleId="ds-buttons-title"
          title="Button hierarchy"
          description="Primary booking, secondary exploration, tertiary text actions, AI, and emergency tones."
        />
        <div className="flex flex-wrap gap-3">
          <WellnessButton variant="primary">Book an Appointment</WellnessButton>
          <WellnessButton variant="secondary">Explore Support</WellnessButton>
          <WellnessButton variant="tertiary">Read More</WellnessButton>
          <WellnessButton variant="ai">Ask Dr. Vandana AI</WellnessButton>
          <WellnessButton variant="emergency">
            Emergency & Mental Health Support
          </WellnessButton>
          <WellnessButton variant="ghost">Dismiss</WellnessButton>
          <WellnessButton variant="primary" loading>
            Saving
          </WellnessButton>
          <WellnessButton variant="secondary" disabled>
            Unavailable
          </WellnessButton>
        </div>
      </WellnessSection>

      <WellnessSection tone="soft" aria-labelledby="ds-cards-title">
        <SectionHeading
          titleId="ds-cards-title"
          title="Card language"
          description="Support, resources, appointment, and AI cards share spacing, radius, and typography."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <SupportCard
            title="Child & Adolescent Psychology"
            description="Age-appropriate psychological support and guidance for children, teens, and families."
            href="/child-adolescent-psychology"
            icon={HeartIcon}
          />
          <SupportCard
            title="Stress & Anxiety Wellness"
            description="Educational information about stress, worry, and emotional balance."
            href="/stress-anxiety-wellness"
            icon={LeafIcon}
          />
          <ResourceCard
            title="Understanding Counselling"
            description="What counselling is and when it may help."
            href="/psychology/counselling"
            meta="Resource"
          />
          <AppointmentCard href="/book-appointment" />
          <AIWellnessCard href="/psychology/ask-dr-vandana-ai" />
          <WellnessCard interactive>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-brand)]">
                <BookIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--color-brand)]">
                  Base wellness card
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Use the shared shell when a specialised card is not needed.
                </p>
              </div>
            </div>
          </WellnessCard>
        </div>
      </WellnessSection>

      <WellnessSection aria-labelledby="ds-support-title">
        <SectionHeading
          titleId="ds-support-title"
          title="Support patterns"
          description="Examples linked only to routes that already exist on this site."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SupportCard
            title="Areas of Support"
            description="Explore the full map of psychological support areas."
            href="/areas-of-support"
            icon={HeartIcon}
            ctaLabel="View areas"
          />
          <SupportCard
            title="Case Studies"
            description="Fictional teaching examples for learning purposes."
            href="/psychology/case-studies"
            icon={BookIcon}
            ctaLabel="View studies"
          />
          <SupportCard
            title="Ask Dr. Vandana AI"
            description="Educational mental-wellness information and guidance."
            href="/psychology/ask-dr-vandana-ai"
            icon={SparkleIcon}
            ctaLabel="Open AI"
          />
        </div>
      </WellnessSection>

      <WellnessSection tone="soft" aria-labelledby="ds-notice-title">
        <SectionHeading
          titleId="ds-notice-title"
          title="Notices & FAQ"
          description="Calm status messaging and native disclosure for accessibility."
        />
        <div className="grid gap-4">
          <StatusNotice title="Confidential space" tone="success">
            Counselling conversations are treated with professional
            confidentiality within ethical and legal limits.
          </StatusNotice>
          <StatusNotice title="Take care with urgency" tone="warning">
            Website content is educational. It is not a crisis hotline and does
            not replace personalised clinical assessment.
          </StatusNotice>
          <StatusNotice
            title="Emergency & mental health support"
            tone="emergency"
            role="alert"
          >
            If you are in immediate danger, contact local emergency services
            now. For non-urgent concerns,{" "}
            <a href="/stress-anxiety-wellness#emergency-boundary-heading">
              read the emergency boundary guidance
            </a>
            .
          </StatusNotice>
          <WellnessFaq items={faqItems} />
        </div>
      </WellnessSection>

      <WellnessSection aria-labelledby="ds-testimonial-title">
        <SectionHeading
          titleId="ds-testimonial-title"
          title="Testimonial structure"
          description="Structural only — never invent client stories. Illustrative placeholder below."
        />
        <div className="max-w-2xl">
          <TestimonialCard
            quote="I felt listened to without pressure, and left with clearer next steps for my wellbeing."
            attribution="Illustrative example"
            context="Not a real client testimonial — replace only with verified permissioned quotes."
          />
        </div>
      </WellnessSection>

      <WellnessSection
        tone="brand-soft"
        aria-labelledby="ds-principles-title"
      >
        <SectionHeading
          titleId="ds-principles-title"
          title="Design principles"
          description={designSystemMeta.tagline}
        />
        <ul className="grid gap-3 sm:grid-cols-2">
          {designSystemMeta.principles.map((principle) => (
            <li
              key={principle}
              className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-brand-muted)_28%,transparent)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]"
            >
              {principle}
            </li>
          ))}
        </ul>
      </WellnessSection>
    </>
  );
}
