"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/types/navigation";
import { cn } from "@/lib/utils";

type NavLinkItemProps = {
  item: NavItem;
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
        "rounded-md px-2 py-2.5 text-sm no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
        active
          ? "text-brand font-medium"
          : "text-text-muted hover:text-brand",
        className,
      )}
    >
      {item.label}
    </Link>
  );
}
