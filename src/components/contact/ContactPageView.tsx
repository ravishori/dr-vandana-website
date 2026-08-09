import { DigipinCopyButton } from "@/components/contact/DigipinCopyButton";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import {
  MapPinIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { contactPage, practiceContact } from "@/data/contact";
import {
  getBookingHref,
  getMapsHref,
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
          <article className="border-brand-muted/25 bg-surface rounded-[var(--radius-xl)] border px-5 py-7 md:px-8 md:py-8">
            <header className="border-brand-muted/20 border-b pb-5">
              <h2
                id="contact-location-heading"
                className="font-display text-text text-2xl tracking-tight md:text-[1.75rem]"
              >
                {practiceContact.practiceName}
              </h2>
              <p className="text-text-muted mt-1 text-sm font-medium tracking-wide uppercase">
                {practiceContact.profession}
              </p>
            </header>

            <div className="mt-6 grid gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="flex items-start gap-3">
                  <span className="bg-brand-muted/15 text-brand mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <MapPinIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-text text-sm font-semibold tracking-wide uppercase">
                      Address
                    </h3>
                    <address className="text-text mt-2 text-sm leading-relaxed not-italic md:text-base">
                      {practiceContact.addressLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  </div>
                </div>
              </div>

              <div className="border-brand-muted/20 bg-background rounded-[var(--radius-lg)] border px-4 py-4">
                <p className="text-text-muted text-xs font-semibold tracking-[0.16em] uppercase">
                  {practiceContact.labels.digipin}
                </p>
                <p className="text-text mt-2 font-mono text-lg tracking-wide md:text-xl">
                  {practiceContact.digipin}
                </p>
                <div className="mt-3">
                  <DigipinCopyButton />
                </div>
              </div>
            </div>

            <div className="border-brand-muted/20 mt-8 border-t pt-6">
              <h3 className="sr-only">Contact actions</h3>
              <ul className="flex flex-col gap-3">
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
                    <WhatsAppIcon className="h-4 w-4" />
                    <span>{practiceContact.labels.bookInstantly}</span>
                  </a>
                </li>
                <li className="grid gap-3 sm:grid-cols-3">
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
                    <WhatsAppIcon className="h-4 w-4" />
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
                    <PhoneIcon className="h-4 w-4" />
                    <span>{practiceContact.labels.call}</span>
                  </a>
                  <a
                    href={getMapsHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={practiceContact.labels.mapsAria}
                    className={cn(
                      actionBase,
                      "bg-surface text-brand border-brand-muted hover:border-brand hover:bg-background border",
                    )}
                  >
                    <MapPinIcon className="h-4 w-4" />
                    <span>{practiceContact.labels.viewOnMaps}</span>
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
          </article>

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
              Email: {contactPage.unverified.email}
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
