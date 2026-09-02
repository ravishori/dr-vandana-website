"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/layout/BrandMark";
import { MobileNavDrawer } from "@/components/navigation/MobileNavDrawer";
import { NavLinkItem } from "@/components/navigation/NavLinkItem";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Container } from "@/components/ui/Container";
import { MenuIcon } from "@/components/ui/icons";
import {
  getNavCta,
  getPrimaryNavItemsForPath,
  loginNavItem,
} from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const items = getPrimaryNavItemsForPath(pathname);
  const cta = getNavCta();
  const onLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  return (
    <header className="bg-background/95 border-brand-muted/20 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <Container className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
        <BrandMark compact className="min-w-0 justify-self-start" />

        <nav
          aria-label="Primary"
          className="hidden justify-self-center lg:block"
        >
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <NavLinkItem
                  item={item}
                  className="whitespace-nowrap px-2.5 py-2.5 text-[0.8125rem] xl:px-3 xl:text-sm"
                />
              </li>
            ))}
          </ul>
        </nav>

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

        <div className="flex items-center justify-self-end gap-1 lg:hidden">
          {!onLoginPage ? (
            <Link
              href={loginNavItem.href}
              className="text-brand hover:bg-surface-soft inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-medium no-underline"
            >
              Login
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
          items={items}
          cta={cta}
          showLogin={!onLoginPage}
        />
      </div>
    </header>
  );
}
