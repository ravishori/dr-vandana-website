import type {
  NavCta,
  NavLinkRef,
  NavigationConfig,
  PrimaryNavItem,
} from "@/types/navigation";

/**
 * Central navigation configuration.
 * Desktop, mobile, and footer navigation should consume this file.
 *
 * Primary nav is IA-consolidated. Every href maps to an existing route
 * or page section on this branch. Login, FAQ, Get Help Now, and Ask a
 * Question are omitted until those routes exist.
 */
export const navigationConfig: NavigationConfig = {
  primary: [
    {
      kind: "link",
      label: "Home",
      href: "/",
    },
    {
      kind: "dropdown",
      id: "about",
      label: "About",
      items: [
        {
          label: "About Dr. Vandana",
          href: "/about",
          description: "Professional background and counselling philosophy.",
        },
        {
          label: "Qualifications & Experience",
          href: "/about#about-qualifications-heading",
          description: "Education, credentials, and clinical experience.",
        },
        {
          label: "Counselling Approach",
          href: "/about#about-approach-heading",
          description: "How sessions are structured and what to expect.",
        },
      ],
    },
    {
      kind: "mega",
      id: "how-i-can-help",
      label: "How I Can Help",
      columns: [
        [
          {
            label: "Children & Adolescents",
            href: "/child-adolescent-psychology",
            description:
              "Age-appropriate psychological support and guidance.",
          },
          {
            label: "Adults",
            href: "/areas-of-support",
            description:
              "Support across emotional, personal, and life concerns.",
          },
          {
            label: "Couples & Relationships",
            href: "/areas-of-support#relationships-family",
            description:
              "Communication, connection, and relationship concerns.",
          },
          {
            label: "Parenting & Family",
            href: "/areas-of-support#relationships-family",
            description:
              "Guidance for parenting challenges and family dynamics.",
          },
        ],
        [
          {
            label: "Stress, Anxiety & Well-being",
            href: "/stress-anxiety-wellness",
            description:
              "Understanding stress, worry, and emotional well-being.",
          },
          {
            label: "Workplace & Burnout",
            href: "/stress-anxiety-wellness#burnout-heading",
            description: "Support for work-related strain and recovery.",
          },
          {
            label: "Personal Growth & Self-esteem",
            href: "/areas-of-support#emotional-wellbeing",
            description:
              "Building confidence and a healthier sense of self.",
          },
        ],
      ],
      footer: {
        label: "Explore support options",
        href: "/areas-of-support",
        description: "Not sure where to start?",
      },
    },
    {
      kind: "dropdown",
      id: "resources",
      label: "Resources",
      items: [
        {
          label: "Understanding Counselling",
          href: "/psychology/counselling",
          description: "What counselling is and when it may help.",
        },
        {
          label: "Anxiety",
          href: "/psychology/anxiety",
          description: "Educational information about anxiety and worry.",
        },
        {
          label: "Stress Management",
          href: "/psychology/stress-management",
          description: "Practical ways to understand and manage stress.",
        },
        {
          label: "Meditation & Mindfulness",
          href: "/stress-anxiety-wellness#mindfulness-heading",
          description: "Gentle practices for presence and emotional balance.",
        },
        {
          label: "Educational Case Studies",
          href: "/psychology/case-studies",
          description: "Fictional teaching examples for learning purposes.",
        },
      ],
    },
    {
      kind: "link",
      label: "AI Assistant",
      href: "/psychology/ask-dr-vandana-ai",
    },
    {
      kind: "link",
      label: "Contact",
      href: "/contact",
    },
  ],
  footer: [
    { label: "Home", href: "/", enabled: true },
    { label: "About", href: "/about", enabled: true },
    { label: "Areas of Support", href: "/areas-of-support", enabled: true },
    {
      label: "Child & Adolescent",
      href: "/child-adolescent-psychology",
      enabled: true,
    },
    {
      label: "Stress & Wellness",
      href: "/stress-anxiety-wellness",
      enabled: true,
    },
    { label: "Contact", href: "/contact", enabled: true },
    {
      label: "Ask Dr. Vandana AI",
      href: "/psychology/ask-dr-vandana-ai",
      enabled: true,
    },
    {
      label: "Case Studies",
      href: "/psychology/case-studies",
      enabled: true,
    },
    { label: "Book an Appointment", href: "/book-appointment", enabled: true },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy", enabled: true },
    { label: "Disclaimer", href: "/disclaimer", enabled: true },
    { label: "Terms", href: "/terms", enabled: true },
  ],
  cta: {
    label: "Book an Appointment",
    href: "/book-appointment",
    enabled: true,
  },
};

export function getEnabledNavItems(items: readonly NavLinkRef[]): NavLinkRef[] {
  return items.filter((item) => item.enabled);
}

export function getPrimaryNavItems(): PrimaryNavItem[] {
  return [...navigationConfig.primary];
}

export function getFooterNavItems(): NavLinkRef[] {
  return getEnabledNavItems(navigationConfig.footer);
}

export function getLegalNavItems(): NavLinkRef[] {
  return getEnabledNavItems(navigationConfig.legal);
}

export function getNavCta(): NavCta | null {
  return navigationConfig.cta.enabled ? navigationConfig.cta : null;
}

/** Flat list of all primary navigable hrefs (for audits / tests). */
export function flattenPrimaryNavHrefs(
  items: readonly PrimaryNavItem[] = navigationConfig.primary,
): string[] {
  const hrefs: string[] = [];
  for (const item of items) {
    if (item.kind === "link") {
      hrefs.push(item.href);
      continue;
    }
    if (item.kind === "dropdown") {
      for (const entry of item.items) hrefs.push(entry.href);
      if (item.footer) hrefs.push(item.footer.href);
      continue;
    }
    for (const column of item.columns) {
      for (const entry of column) hrefs.push(entry.href);
    }
    if (item.footer) hrefs.push(item.footer.href);
  }
  if (navigationConfig.cta.enabled) {
    hrefs.push(navigationConfig.cta.href);
  }
  return hrefs;
}
