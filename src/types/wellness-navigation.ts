/**
 * Icon keys resolved in the drawer UI — keeps config free of React imports.
 */
export type WellnessIconKey =
  | "heart"
  | "book"
  | "sparkle"
  | "calendar"
  | "person"
  | "family"
  | "work"
  | "leaf"
  | "shield"
  | "awareness"
  | "listen"
  | "chevronRight";

export type WellnessDestination = {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: WellnessIconKey;
  /** Calm emphasis for safety-related destinations — not alarm styling. */
  tone?: "default" | "support";
};

export type WellnessHubAction = {
  id: string;
  kind: "panel" | "link";
  label: string;
  description: string;
  icon: WellnessIconKey;
  href?: string;
  panelId?: "support" | "resources";
  ctaLabel?: string;
  emphasis?: "default" | "ai" | "appointment";
};

export type WellnessSecondaryLink = {
  id: string;
  label: string;
  href: string;
};

export type WellnessNestedPanel = {
  id: "support" | "resources";
  title: string;
  intro: string;
  items: WellnessDestination[];
  footer?: {
    label: string;
    href: string;
    description?: string;
  };
};

export type WellnessNavigationConfig = {
  greeting: string;
  supportingText: string;
  hubActions: WellnessHubAction[];
  secondaryLinks: WellnessSecondaryLink[];
  panels: Record<"support" | "resources", WellnessNestedPanel>;
};
