export type NavItem = {
  label: string;
  href: string;
  /** When false, the item is reserved for a future milestone and must not be rendered. */
  enabled: boolean;
};

export type NavCta = {
  label: string;
  href: string;
  enabled: boolean;
};

export type NavigationConfig = {
  primary: readonly NavItem[];
  footer: readonly NavItem[];
  legal: readonly NavItem[];
  cta: NavCta;
};
