import Link from "next/link";

import { BrandMark } from "@/components/layout/BrandMark";
import { Container } from "@/components/ui/Container";
import {
  getFooterNavItems,
  getLegalNavItems,
} from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { practiceContact } from "@/data/contact";
import { emergencyNotice } from "@/data/emergency";
import { professionalProfile } from "@/data/professional";
import {
  getBookingHref,
  getMapsHref,
  getVerifiedWhatsAppHref,
} from "@/lib/contact-actions";
import { isPlaceholder, resolveDisplayValue } from "@/types/site";

export function SiteFooter() {
  const quickLinks = getFooterNavItems();
  const legalLinks = getLegalNavItems();
  const hours = siteConfig.location.consultationHours;

  return (
    <footer className="bg-surface border-brand-muted/25 mt-auto border-t">
      <Container className="py-12 md:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <BrandMark showTagline />
            <p className="text-text-muted mt-4 max-w-sm text-sm leading-relaxed">
              {professionalProfile.positioning}
            </p>
          </div>

          <div>
            <h2 className="font-sans text-sm font-semibold tracking-wide text-[var(--color-brand)] uppercase">
              Quick Links
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-text-muted hover:text-brand text-sm no-underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-sans text-sm font-semibold tracking-wide text-[var(--color-brand)] uppercase">
              Contact
            </h2>
            <div className="text-text-muted mt-4 space-y-2 text-sm">
              <p className="text-text font-medium">
                {practiceContact.practiceName}
              </p>
              <p>{practiceContact.profession}</p>
              <p>
                WhatsApp:{" "}
                <a
                  href={getVerifiedWhatsAppHref()}
                  className="text-brand no-underline hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={practiceContact.labels.whatsappAria}
                >
                  {practiceContact.whatsappDisplay}
                </a>
              </p>
              <p>
                <a
                  href={getBookingHref()}
                  className="text-brand no-underline hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={practiceContact.labels.bookingAria}
                >
                  {practiceContact.labels.bookInstantly}
                </a>
              </p>
              <p className="text-text-muted">
                Email: {resolveDisplayValue(siteConfig.contact.email)}
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-sans text-sm font-semibold tracking-wide text-[var(--color-brand)] uppercase">
              Location
            </h2>
            <div className="text-text-muted mt-4 space-y-2 text-sm">
              <p>{practiceContact.locality}</p>
              <p>{practiceContact.cityWithPin}</p>
              <p>
                <a
                  href={getMapsHref()}
                  className="text-brand no-underline hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={practiceContact.labels.mapsAria}
                >
                  {practiceContact.labels.viewOnMaps}
                </a>
              </p>
              {!isPlaceholder(hours) ? (
                <p>Hours: {resolveDisplayValue(hours)}</p>
              ) : null}
            </div>
          </div>
        </div>

        <aside
          className="border-brand-muted/40 bg-background mt-10 rounded-[var(--radius-lg)] border px-4 py-4 md:px-5"
          aria-label="Emergency information"
        >
          <h2 className="font-sans text-sm font-semibold text-[var(--color-brand)]">
            {emergencyNotice.title}
          </h2>
          <p className="text-text mt-2 text-sm leading-relaxed">
            {emergencyNotice.message}
          </p>
          <p className="text-text-muted mt-2 text-sm leading-relaxed">
            {emergencyNotice.clarification}
          </p>
          {emergencyNotice.isPlaceholder ? (
            <p className="text-text-muted mt-2 text-xs">
              Verified emergency helpline details will be added when confirmed.
            </p>
          ) : null}
        </aside>

        <div className="border-brand-muted/25 mt-8 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-text-muted text-xs md:text-sm">
            © {new Date().getFullYear()} {siteConfig.professionalName}. All
            rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-text-muted hover:text-brand text-xs no-underline md:text-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
