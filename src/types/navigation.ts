/** Flat nav link used by footer / legal lists. */
export type NavLinkRef = {
  label: string;
  href: string;
  /** When false, reserved for a future route — must not be rendered. */
  enabled: boolean;
};

export type NavCta = {
  label: string;
  href: string;
  enabled: boolean;
};

export type NavMenuEntry = {
  label: string;
  href: string;
  description?: string;
};

export type NavMenuFooter = {
  label: string;
  href: string;
  description?: string;
};

export type PrimaryNavLink = {
  kind: "link";
  label: string;
  href: string;
};

export type PrimaryNavDropdown = {
  kind: "dropdown";
  id: string;
  label: string;
  items: NavMenuEntry[];
  footer?: NavMenuFooter;
};

export type PrimaryNavMega = {
  kind: "mega";
  id: string;
  label: string;
  columns: NavMenuEntry[][];
  footer?: NavMenuFooter;
};

/** Rich primary navigation item (desktop + mobile header). */
export type PrimaryNavItem =
  | PrimaryNavLink
  | PrimaryNavDropdown
  | PrimaryNavMega;

/**
 * @deprecated Prefer PrimaryNavItem for header nav.
 * Kept as alias for flat footer/legal consumers that historically used NavItem.
 */
export type NavItem = NavLinkRef;

export type NavigationConfig = {
  primary: readonly PrimaryNavItem[];
  footer: readonly NavLinkRef[];
  legal: readonly NavLinkRef[];
  cta: NavCta;
};
