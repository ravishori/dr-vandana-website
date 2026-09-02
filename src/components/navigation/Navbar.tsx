"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/layout/BrandMark";
import { MobileNavDrawer } from "@/components/navigation/MobileNavDrawer";
import { NavLinkItem } from "@/components/navigation/NavLinkItem";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Container } from "@/components/ui/Container";
import { MenuIcon } from "@/components/ui/icons";
import {
  getDesktopCenterNavItems,
  getDrawerNavItems,
  getNavCta,
  getTabletCenterNavItems,
  loginNavItem,
} from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Adaptive header: CSS breakpoints drive mobile / tablet / desktop chrome.
 * Shared navigation data — no duplicated business logic.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const desktopItems = getDesktopCenterNavItems(pathname);
  const tabletItems = getTabletCenterNavItems(pathname);
  const drawerItems = getDrawerNavItems(pathname);
  const cta = getNavCta();
  const onLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  useEffect(() => {
    document.documentElement.dataset.navDrawer = menuOpen ? "open" : "closed";
    return () => {
      delete document.documentElement.dataset.navDrawer;
    };
  }, [menuOpen]);

  return (
    <header className="bg-background/95 border-brand-muted/20 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <Container className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-2 py-3 md:gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
        <BrandMark compact className="min-w-0 justify-self-start" />

        {/* Desktop center nav */}
        <nav
          aria-label="Primary"
          className="hidden justify-self-center lg:block"
        >
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {desktopItems.map((item) => (
              <li key={item.href}>
                <NavLinkItem
                  item={item}
                  className="whitespace-nowrap px-2.5 py-2.5 text-[0.8125rem] xl:px-3 xl:text-sm"
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Tablet compact center nav — intentional mid-width layout */}
        <nav
          aria-label="Primary"
          className="hidden min-w-0 justify-self-stretch overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:block lg:hidden [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-max max-w-full items-center gap-0.5 px-1">
            {tabletItems.map((item) => (
              <li key={item.href} className="shrink-0">
                <NavLinkItem
                  item={item}
                  className="whitespace-nowrap px-2 py-2 text-[0.75rem]"
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center justify-self-end gap-2 lg:flex">
          <ThemeSwitcher />
          {!onLoginPage ? (
            <Link
              href={loginNavItem.href}
              className={cn(
                "text-text-muted hover:text-brand inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
                pathname.startsWith("/login") && "text-brand",
              )}
            >
              {loginNavItem.label}
            </Link>
          ) : null}
          {cta ? (
            <Link
              href={cta.href}
              className="bg-accent text-text hover:bg-accent/90 inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium whitespace-nowrap no-underline shadow-sm transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>

        {/* Mobile + tablet actions */}
        <div className="flex items-center justify-self-end gap-1 lg:hidden">
          {!onLoginPage ? (
            <Link
              href={loginNavItem.href}
              className="text-brand hover:bg-surface-soft inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-2.5 text-sm font-medium no-underline md:px-3"
            >
              Login
            </Link>
          ) : null}
          {cta ? (
            <Link
              href={cta.href}
              aria-label={cta.label}
              className="bg-accent text-text hover:bg-accent/90 hidden min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-medium whitespace-nowrap no-underline shadow-sm md:inline-flex"
            >
              Book
            </Link>
          ) : null}
          <button
            type="button"
            className="text-text hover:bg-surface-soft inline-flex min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center rounded-md"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </Container>

      <div id="mobile-navigation">
        <MobileNavDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={drawerItems}
          cta={cta}
          showLogin={!onLoginPage}
        />
      </div>
    </header>
  );
}
