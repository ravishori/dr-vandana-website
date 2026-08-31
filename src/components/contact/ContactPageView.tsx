import { PracticeLocationCard } from "@/components/contact/PracticeLocationCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { contactPage, practiceContact } from "@/data/contact";
import {
  getBookingHref,
  getVerifiedEmailHref,
  getVerifiedPhoneHref,
  getVerifiedWhatsAppHref,
} from "@/lib/contact-actions";
import { cn } from "@/lib/utils";

const actionBase =
  "inline-flex min-h-[var(--touch-target-min)] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none sm:w-auto";

export function ContactPageView() {
  return (
    <>
      <section
        aria-labelledby="contact-heading"
        className="border-brand-muted/20 border-b"
      >
        <Container className="max-w-3xl py-14 md:py-16 lg:py-20">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            Get in touch
          </p>
          <h1
            id="contact-heading"
            className="mt-4 text-[clamp(2rem,4.5vw,3rem)]"
          >
            {contactPage.heading}
          </h1>
          <p className="text-text mt-5 text-base leading-relaxed md:text-lg">
            {contactPage.introduction}
          </p>
          <p className="text-text-muted mt-4 text-base leading-relaxed">
            {contactPage.enquiryNote}
          </p>
        </Container>
      </section>

      <Section aria-labelledby="contact-location-heading">
        <Container className="max-w-3xl">
          <PracticeLocationCard />

          <div className="border-brand-muted/25 bg-surface mt-6 rounded-[var(--radius-xl)] border px-5 py-6 md:px-8">
            <h3 className="text-text text-sm font-semibold tracking-wide uppercase">
              Contact actions
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a
                  href={getBookingHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={practiceContact.labels.bookingAria}
                  className={cn(
                    actionBase,
                    "bg-accent text-text hover:bg-accent/90 border border-transparent shadow-sm",
                  )}
                >
                  <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{practiceContact.labels.bookInstantly}</span>
                </a>
              </li>
              <li className="grid gap-3 sm:grid-cols-2">
                <a
                  href={getVerifiedWhatsAppHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={practiceContact.labels.whatsappAria}
                  className={cn(
                    actionBase,
                    "bg-surface text-brand border-brand-muted hover:border-brand hover:bg-background border",
                  )}
                >
                  <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{practiceContact.labels.whatsapp}</span>
                </a>
                <a
                  href={getVerifiedPhoneHref()}
                  aria-label={practiceContact.labels.callAria}
                  className={cn(
                    actionBase,
                    "bg-surface text-brand border-brand-muted hover:border-brand hover:bg-background border",
                  )}
                >
                  <PhoneIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{practiceContact.labels.call}</span>
                </a>
              </li>
            </ul>
            <p className="text-text-muted mt-4 text-sm">
              WhatsApp / appointment:{" "}
              <span className="text-text font-medium">
                {practiceContact.whatsappDisplay}
              </span>
            </p>
          </div>

          <aside
            className="border-brand-muted/40 bg-background mt-6 rounded-[var(--radius-lg)] border px-5 py-4"
            aria-label="Privacy reminder"
          >
            <p className="text-text-muted text-sm leading-relaxed">
              {contactPage.privacyNote}
            </p>
          </aside>

          <div className="text-text-muted mt-6 space-y-2 text-sm">
            <p>
              Email:{" "}
              <a
                href={getVerifiedEmailHref()}
                className="text-brand no-underline hover:underline"
                aria-label={practiceContact.labels.emailAria}
              >
                {practiceContact.emailDisplay}
              </a>
            </p>
            <p>
              Consultation hours: {contactPage.unverified.consultationHours}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={contactPage.secondaryCta.href}>
              {contactPage.secondaryCta.label}
            </ButtonLink>
            <ButtonLink href={contactPage.tertiaryCta.href} variant="secondary">
              {contactPage.tertiaryCta.label}
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
