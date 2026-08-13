import Link from "next/link";

import {
  CalendarIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { getNavCta } from "@/config/navigation";
import { practiceContact } from "@/data/contact";
import {
  getVerifiedPhoneHref,
  getVerifiedWhatsAppHref,
} from "@/lib/contact-actions";
import { cn } from "@/lib/utils";

const actionClassName =
  "inline-flex min-h-[var(--touch-target-min)] flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-xs font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none";

export function MobileQuickBar() {
  const cta = getNavCta();
  const phoneHref = getVerifiedPhoneHref();
  const whatsappHref = getVerifiedWhatsAppHref();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <nav
        aria-label="Quick actions"
        className="border-brand-muted/30 bg-surface/95 pointer-events-auto border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(43,51,44,0.08)] backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-lg items-stretch gap-1">
          <li className="flex flex-1">
            <Link
              href="/mental-health-support"
              className={cn(actionClassName, "text-brand hover:bg-background")}
              aria-label="Get mental health support and emergency help"
            >
              <PhoneIcon className="h-4 w-4" />
              <span>Help</span>
            </Link>
          </li>

          <li className="flex flex-1">
            {cta ? (
              <Link
                href={cta.href}
                className={cn(
                  actionClassName,
                  "bg-accent/20 text-text hover:bg-accent/30",
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Book</span>
              </Link>
            ) : null}
          </li>

          <li className="flex flex-1">
            <a
              href={whatsappHref}
              className={cn(actionClassName, "text-brand hover:bg-background")}
              rel="noopener noreferrer"
              target="_blank"
              aria-label={practiceContact.labels.whatsappAria}
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>WhatsApp</span>
            </a>
          </li>

          <li className="flex flex-1">
            <a
              href={phoneHref}
              className={cn(actionClassName, "text-brand hover:bg-background")}
              aria-label={practiceContact.labels.callAria}
            >
              <PhoneIcon className="h-4 w-4" />
              <span>Call</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
