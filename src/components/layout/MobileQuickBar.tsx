import Link from "next/link";

import {
  CalendarIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { getNavCta } from "@/config/navigation";
import { cn } from "@/lib/utils";

const actionClassName =
  "inline-flex min-h-[var(--touch-target-min)] flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none";

export function MobileQuickBar() {
  const cta = getNavCta();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <nav
        aria-label="Quick actions"
        className="border-brand-muted/25 bg-surface/95 pointer-events-auto border-t px-3 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(43,51,44,0.08)] backdrop-blur-md"
      >
        <ul className="mx-auto flex max-w-lg items-stretch gap-2">
          <li className="flex flex-1">
            <Link
              href="/psychology/ask-dr-vandana-ai"
              className={cn(
                actionClassName,
                "bg-brand text-white hover:bg-brand/90",
              )}
            >
              <SparklesIcon className="h-4 w-4 shrink-0" />
              <span>Ask AI</span>
            </Link>
          </li>

          <li className="flex flex-1">
            {cta ? (
              <Link
                href={cta.href}
                className={cn(
                  actionClassName,
                  "bg-accent text-text hover:bg-accent/90",
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span>Book Appointment</span>
              </Link>
            ) : null}
          </li>
        </ul>
      </nav>
    </div>
  );
}
