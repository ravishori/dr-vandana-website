import type { WellnessNavigationConfig } from "@/types/wellness-navigation";

/**
 * Smart Wellness Navigation V2 — mobile drawer information architecture.
 *
 * Every href maps to an existing route or in-page section on this branch.
 * Secure Portal (Patient Login / Registration / Psychologist Login),
 * standalone FAQ, Ask a Question, and dedicated Emergency pages are omitted
 * because those routes do not exist here yet.
 */
export const wellnessNavigationConfig: WellnessNavigationConfig = {
  greeting: "How can we support you today?",
  supportingText: "Explore support, resources, and ways to connect.",
  hubActions: [
    {
      id: "explore-support",
      kind: "panel",
      panelId: "support",
      label: "Explore Support",
      description: "Find information about areas of psychological support.",
      icon: "heart",
      emphasis: "default",
    },
    {
      id: "learn-resources",
      kind: "panel",
      panelId: "resources",
      label: "Learn & Resources",
      description: "Guides, educational pages, and wellness information.",
      icon: "book",
      emphasis: "default",
    },
    {
      id: "ask-ai",
      kind: "link",
      href: "/psychology/ask-dr-vandana-ai",
      label: "Ask Dr. Vandana AI",
      description:
        "Explore educational mental-wellness information and guidance.",
      icon: "sparkle",
      ctaLabel: "Start Chat",
      emphasis: "ai",
    },
    {
      id: "book-appointment",
      kind: "link",
      href: "/book-appointment",
      label: "Book an Appointment",
      description: "Schedule a consultation with Dr. Vandana.",
      icon: "calendar",
      ctaLabel: "Schedule Consultation",
      emphasis: "appointment",
    },
  ],
  secondaryLinks: [
    { id: "home", label: "Home", href: "/" },
    { id: "about", label: "About Dr. Vandana", href: "/about" },
    { id: "contact", label: "Contact", href: "/contact" },
  ],
  panels: {
    support: {
      id: "support",
      title: "Areas of Support",
      intro:
        "Choose an area to explore. Support is educational and confidential.",
      items: [
        {
          id: "child-adolescent",
          label: "Child & Adolescent",
          description: "Age-appropriate psychological support and guidance.",
          href: "/child-adolescent-psychology",
          icon: "family",
        },
        {
          id: "stress-anxiety",
          label: "Stress & Anxiety",
          description: "Understanding stress, worry, and emotional balance.",
          href: "/stress-anxiety-wellness",
          icon: "leaf",
        },
        {
          id: "depression-awareness",
          label: "Depression Awareness",
          description: "Educational information about low mood and support.",
          href: "/stress-anxiety-wellness#depression-awareness-heading",
          icon: "awareness",
        },
        {
          id: "relationships-family",
          label: "Relationships & Family",
          description: "Communication, connection, and family dynamics.",
          href: "/areas-of-support#relationships-family",
          icon: "heart",
        },
        {
          id: "workplace-wellness",
          label: "Workplace Wellness",
          description: "Work-related strain, burnout awareness, and recovery.",
          href: "/stress-anxiety-wellness#burnout-heading",
          icon: "work",
        },
        {
          id: "self-esteem",
          label: "Self-esteem & Confidence",
          description: "Building a healthier sense of self.",
          href: "/areas-of-support#emotional-wellbeing",
          icon: "person",
        },
        {
          id: "grief-emotional",
          label: "Grief & Emotional Wellness",
          description: "Space to understand grief and emotional distress.",
          href: "/areas-of-support#mental-health-awareness",
          icon: "listen",
        },
        {
          id: "personal-growth",
          label: "Personal Growth",
          description: "Reflection, growth, and emotional well-being.",
          href: "/areas-of-support#emotional-wellbeing",
          icon: "leaf",
        },
        {
          id: "mindfulness",
          label: "Mindfulness & Meditation",
          description: "Gentle practices for presence and calm.",
          href: "/stress-anxiety-wellness#mindfulness-heading",
          icon: "leaf",
        },
        {
          id: "emergency-support",
          label: "Emergency & Mental Health Support",
          description:
            "Guidance on seeking urgent help through local emergency services.",
          href: "/stress-anxiety-wellness#emergency-boundary-heading",
          icon: "shield",
          tone: "support",
        },
      ],
      footer: {
        label: "View all areas of support",
        href: "/areas-of-support",
        description: "Not sure where to start?",
      },
    },
    resources: {
      id: "resources",
      title: "Learn & Resources",
      intro:
        "Educational pages to help you understand counselling and wellness.",
      items: [
        {
          id: "counselling",
          label: "Understanding Counselling",
          description: "What counselling is and when it may help.",
          href: "/psychology/counselling",
          icon: "book",
        },
        {
          id: "anxiety-guide",
          label: "Anxiety Guide",
          description: "Educational information about anxiety and worry.",
          href: "/psychology/anxiety",
          icon: "awareness",
        },
        {
          id: "stress-guide",
          label: "Stress Management",
          description: "Practical ways to understand and manage stress.",
          href: "/psychology/stress-management",
          icon: "leaf",
        },
        {
          id: "meditation",
          label: "Meditation & Mindfulness",
          description: "Gentle practices for presence and emotional balance.",
          href: "/stress-anxiety-wellness#mindfulness-heading",
          icon: "leaf",
        },
        {
          id: "case-studies",
          label: "Educational Case Studies",
          description: "Fictional teaching examples for learning purposes.",
          href: "/psychology/case-studies",
          icon: "book",
        },
        {
          id: "parenting-resources",
          label: "Parenting Resources",
          description: "Support for children, adolescents, and families.",
          href: "/child-adolescent-psychology",
          icon: "family",
        },
        {
          id: "workplace-resources",
          label: "Workplace Wellness",
          description: "Burnout awareness and healthier work-life balance.",
          href: "/areas-of-support#workplace-wellbeing",
          icon: "work",
        },
      ],
    },
  },
};
