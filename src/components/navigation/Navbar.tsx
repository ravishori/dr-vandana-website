"use client";

import { useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/layout/BrandMark";
import { DesktopPrimaryNav } from "@/components/navigation/DesktopPrimaryNav";
import { MobileNavDrawer } from "@/components/navigation/MobileNavDrawer";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Container } from "@/components/ui/Container";
import { MenuIcon } from "@/components/ui/icons";
import { getNavCta, getPrimaryNavItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

const bookCtaClassName = cn(
  "inline-flex min-h-10 items-center justify-center px-3.5 text-sm font-medium whitespace-nowrap no-underline xl:px-4",
  "rounded-[9px] bg-brand text-white",
  "shadow-none transition-[background-color,box-shadow,transform] duration-[180ms] motion-reduce:transition-none",
  "hover:bg-[color-mix(in_srgb,var(--color-brand)_88%,black)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2",
);

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = getPrimaryNavItems();
  const cta = getNavCta();

  return (
    <>
      <header className="bg-background/95 border-brand-muted/25 sticky top-0 z-40 border-b backdrop-blur-sm">
        <Container className="flex min-h-16 items-center justify-between gap-3 py-3 sm:gap-4">
          <BrandMark compact className="min-w-0 shrink" />

          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center justify-end gap-1 xl:flex"
          >
            <DesktopPrimaryNav items={items} />

            <div className="ml-2 flex shrink-0 items-center gap-2">
              <ThemeSwitcher />
              {cta ? (
                <Link href={cta.href} className={bookCtaClassName}>
                  {cta.label}
                </Link>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-1 xl:hidden">
            <ThemeSwitcher />
            <button
              type="button"
              className="text-text hover:bg-surface inline-flex min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
              aria-label="Open wellness navigation"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </Container>
      </header>

      {/*
        Keep the drawer outside the sticky/backdrop-blur header so
        position:fixed covers the viewport rather than the header box.
      */}
      <div id="mobile-navigation">
        <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </>
  );
}
