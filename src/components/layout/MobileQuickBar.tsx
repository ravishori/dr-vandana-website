import Link from "next/link";

import {
  CalendarIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { getNavCta } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getPhoneHref, getWhatsAppHref } from "@/lib/contact-actions";
import { cn } from "@/lib/utils";

const actionClassName =
  "inline-flex min-h-[var(--touch-target-min)] flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-xs font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none";

export function MobileQuickBar() {
  const cta = getNavCta();
  const phoneHref = getPhoneHref(siteConfig.contact.phone);
  const whatsappHref = getWhatsAppHref(siteConfig.contact.whatsapp);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <nav
        aria-label="Quick actions"
        className="border-brand-muted/30 bg-surface/95 pointer-events-auto border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(43,51,44,0.08)] backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-lg items-stretch gap-1">
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
            {whatsappHref ? (
              <a
                href={whatsappHref}
                className={cn(
                  actionClassName,
                  "text-brand hover:bg-background",
                )}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className={cn(
                  actionClassName,
                  "text-text-muted cursor-not-allowed opacity-70",
                )}
                aria-label="WhatsApp unavailable — number to be confirmed"
                title="WhatsApp number to be confirmed"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span>WhatsApp</span>
              </button>
            )}
          </li>

          <li className="flex flex-1">
            {phoneHref ? (
              <a
                href={phoneHref}
                className={cn(
                  actionClassName,
                  "text-brand hover:bg-background",
                )}
              >
                <PhoneIcon className="h-4 w-4" />
                <span>Call</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className={cn(
                  actionClassName,
                  "text-text-muted cursor-not-allowed opacity-70",
                )}
                aria-label="Call unavailable — phone number to be confirmed"
                title="Phone number to be confirmed"
              >
                <PhoneIcon className="h-4 w-4" />
                <span>Call</span>
              </button>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}
