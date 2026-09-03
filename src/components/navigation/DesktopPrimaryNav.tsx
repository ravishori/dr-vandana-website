"use client";

import Link from "next/link";
import { useState } from "react";

import { NavDropdown } from "@/components/navigation/NavDropdown";
import { NavLinkItem } from "@/components/navigation/NavLinkItem";
import { NavMenuLink } from "@/components/navigation/NavMenuLink";
import type { PrimaryNavItem } from "@/types/navigation";

type DesktopPrimaryNavProps = {
  items: PrimaryNavItem[];
};

export function DesktopPrimaryNav({ items }: DesktopPrimaryNavProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="flex flex-wrap items-center justify-end gap-x-0.5 gap-y-1 xl:gap-x-1">
      {items.map((item) => {
        if (item.kind === "link") {
          return (
            <li key={item.href}>
              <NavLinkItem item={item} className="whitespace-nowrap" />
            </li>
          );
        }

        const isOpen = openId === item.id;

        return (
          <li key={item.id}>
            <NavDropdown
              id={item.id}
              label={item.label}
              open={isOpen}
              onOpenChange={(next) => setOpenId(next ? item.id : null)}
              mega={item.kind === "mega"}
            >
              {item.kind === "dropdown" ? (
                <div className="p-2">
                  <ul className="flex flex-col gap-0.5">
                    {item.items.map((entry) => (
                      <li key={`${entry.href}-${entry.label}`} role="none">
                        <NavMenuLink
                          item={entry}
                          onNavigate={() => setOpenId(null)}
                        />
                      </li>
                    ))}
                  </ul>
                  {item.footer ? (
                    <div className="border-brand-muted/25 mt-2 border-t px-3 pt-3 pb-2">
                      {item.footer.description ? (
                        <p className="text-text-muted text-xs">
                          {item.footer.description}
                        </p>
                      ) : null}
                      <Link
                        href={item.footer.href}
                        onClick={() => setOpenId(null)}
                        className="text-brand mt-1 inline-flex text-sm font-medium no-underline hover:underline"
                      >
                        {item.footer.label}
                        <span aria-hidden className="ml-1">
                          →
                        </span>
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="p-3 sm:p-4">
                  <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-4">
                    {item.columns.map((column, columnIndex) => (
                      <ul
                        key={`col-${columnIndex}`}
                        className="flex flex-col gap-0.5"
                      >
                        {column.map((entry) => (
                          <li
                            key={`${entry.href}-${entry.label}`}
                            role="none"
                          >
                            <NavMenuLink
                              item={entry}
                              onNavigate={() => setOpenId(null)}
                            />
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                  {item.footer ? (
                    <div className="border-brand-muted/25 mt-3 flex flex-col gap-0.5 border-t px-3 pt-3 pb-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <p className="text-text-muted text-xs">
                        {item.footer.description}
                      </p>
                      <Link
                        href={item.footer.href}
                        onClick={() => setOpenId(null)}
                        className="text-brand inline-flex shrink-0 text-sm font-medium no-underline hover:underline"
                      >
                        {item.footer.label}
                        <span aria-hidden className="ml-1">
                          →
                        </span>
                      </Link>
                    </div>
                  ) : null}
                </div>
              )}
            </NavDropdown>
          </li>
        );
      })}
    </ul>
  );
}
