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
    { label: "Blog", href: "/blog", enabled: true },
    { label: "Resources", href: "/resources", enabled: true },
    { label: "Videos", href: "/videos", enabled: true },
    { label: "Contact", href: "/contact", enabled: true },
    // Future — enable only when routes exist
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
    { label: "Blog", href: "/blog", enabled: true },
    { label: "Resources", href: "/resources", enabled: true },
    { label: "Videos", href: "/videos", enabled: true },
    { label: "Contact", href: "/contact", enabled: true },
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
