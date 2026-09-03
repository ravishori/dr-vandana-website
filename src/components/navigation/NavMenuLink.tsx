"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavMenuEntry } from "@/types/navigation";
import { cn } from "@/lib/utils";

type NavMenuLinkProps = {
  item: NavMenuEntry;
  onNavigate?: () => void;
  className?: string;
};

function pathMatches(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] || "/";
  if (pathOnly === "/") {
    return pathname === "/";
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

export function NavMenuLink({ item, onNavigate, className }: NavMenuLinkProps) {
  const pathname = usePathname();
  const active = pathMatches(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group block rounded-[10px] px-3 py-2.5 no-underline transition-colors duration-[180ms] motion-reduce:transition-none",
        "hover:bg-surface-soft focus-visible:bg-surface-soft",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--palette-focus-ring)] focus-visible:ring-offset-2",
        className,
      )}
    >
      <span
        className={cn(
          "block text-sm font-medium leading-snug",
          active ? "text-brand" : "text-text group-hover:text-brand",
        )}
      >
        {item.label}
      </span>
      {item.description ? (
        <span className="text-text-muted mt-0.5 block text-xs leading-relaxed">
          {item.description}
        </span>
      ) : null}
    </Link>
  );
}
