import type { NavCta, NavItem, NavigationConfig } from "@/types/navigation";

/**
 * Central navigation configuration.
 * Desktop, mobile, and footer navigation should consume this file.
 * Disabled items are intentional future routes — do not render them as links.
 */
export const navigationConfig: NavigationConfig = {
  primary: [
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
    {
      label: "Ask AI",
      href: "/psychology/ask-dr-vandana-ai",
      enabled: true,
    },
    {
      label: "Ask a Question",
      href: "/ask-a-question",
      enabled: true,
    },
    {
      label: "Get Help Now",
      href: "/mental-health-support",
      enabled: true,
    },
    {
      label: "FAQ",
      href: "/understanding-counselling",
      enabled: true,
    },
    { label: "Contact", href: "/contact", enabled: true },
    {
      label: "Patient Login",
      href: "/patient/login",
      enabled: true,
    },
    {
      label: "Psychologist Login",
      href: "/psychologist/practice/login",
      enabled: true,
    },
    // Phase 2 — enable only when routes exist
    { label: "Resources", href: "/resources", enabled: false },
    { label: "Workshops", href: "/workshops", enabled: false },
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
    {
      label: "Understanding Counselling",
      href: "/understanding-counselling",
      enabled: true,
    },
    {
      label: "Emergency & Mental Health Support",
      href: "/mental-health-support",
      enabled: true,
    },
    { label: "Contact", href: "/contact", enabled: true },
    {
      label: "Ask Dr. Vandana AI",
      href: "/psychology/ask-dr-vandana-ai",
      enabled: true,
    },
    {
      label: "Ask a Question",
      href: "/ask-a-question",
      enabled: true,
    },
    {
      label: "Case Studies",
      href: "/psychology/case-studies",
      enabled: true,
    },
    { label: "Book an Appointment", href: "/book-appointment", enabled: true },
    {
      label: "Patient Login",
      href: "/patient/login",
      enabled: true,
    },
    {
      label: "Patient Registration",
      href: "/patient/register",
      enabled: true,
    },
    {
      label: "Psychologist Login",
      href: "/psychologist/practice/login",
      enabled: true,
    },
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

export function getEnabledNavItems(items: readonly NavItem[]): NavItem[] {
  return items.filter((item) => item.enabled);
}

export function getPrimaryNavItems(): NavItem[] {
  return getEnabledNavItems(navigationConfig.primary);
}

export function getFooterNavItems(): NavItem[] {
  return getEnabledNavItems(navigationConfig.footer);
}

export function getLegalNavItems(): NavItem[] {
  return getEnabledNavItems(navigationConfig.legal);
}

export function getNavCta(): NavCta | null {
  return navigationConfig.cta.enabled ? navigationConfig.cta : null;
}
