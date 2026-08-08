"use client";

import { useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/layout/BrandMark";
import { MobileNavDrawer } from "@/components/navigation/MobileNavDrawer";
import { NavLinkItem } from "@/components/navigation/NavLinkItem";
import { Container } from "@/components/ui/Container";
import { MenuIcon } from "@/components/ui/icons";
import {
  getNavCta,
  getPrimaryNavItems,
} from "@/config/navigation";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = getPrimaryNavItems();
  const cta = getNavCta();

  return (
    <header className="bg-background/95 border-brand-muted/25 sticky top-0 z-40 border-b backdrop-blur-sm">
      <Container className="flex min-h-16 items-center justify-between gap-4 py-3">
        <BrandMark compact className="min-w-0 shrink" />

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 items-center justify-end gap-1 lg:flex xl:gap-2"
        >
          <ul className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <NavLinkItem item={item} className="whitespace-nowrap" />
              </li>
            ))}
          </ul>

          {cta ? (
            <Link
              href={cta.href}
              className="bg-accent text-text hover:bg-accent/90 ml-3 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium whitespace-nowrap no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none"
            >
              {cta.label}
            </Link>
          ) : null}
        </nav>

        <button
          type="button"
          className="text-text hover:bg-surface inline-flex min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center rounded-md lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </Container>

      <div id="mobile-navigation">
        <MobileNavDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={items}
          cta={cta}
        />
      </div>
    </header>
  );
}
