"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { PrimaryNavLink } from "@/types/navigation";
import { cn } from "@/lib/utils";

type NavLinkItemProps = {
  item: PrimaryNavLink;
  className?: string;
  onNavigate?: () => void;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinkItem({ item, className, onNavigate }: NavLinkItemProps) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-2 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--palette-focus-ring)] focus-visible:ring-offset-2",
        active
          ? "text-brand"
          : "text-text-muted hover:text-brand",
        className,
      )}
    >
      {item.label}
    </Link>
  );
}
