import { Container } from "@/components/ui/Container";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { practiceContact } from "@/data/contact";
import { getBookingHref } from "@/lib/contact-actions";

/**
 * External WhatsApp booking path — not the website appointment backend.
 */
export function AppointmentWhatsAppCta() {
  return (
    <Section aria-labelledby="appointment-whatsapp-cta-heading" className="pt-0">
      <Container className="max-w-3xl">
        <div className="border-brand-muted/25 bg-surface rounded-[var(--radius-xl)] border px-5 py-5 md:px-6">
          <h2
            id="appointment-whatsapp-cta-heading"
            className="text-text text-base font-semibold md:text-lg"
          >
            Prefer WhatsApp?
          </h2>
          <p className="text-text-muted mt-2 text-sm leading-relaxed">
            You can message the practice directly on WhatsApp at{" "}
            <span className="text-text font-medium">
              {practiceContact.whatsappDisplay}
            </span>
            , or use the instant booking link below.
          </p>
          <a
            href={getBookingHref()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={practiceContact.labels.bookingAria}
            className="bg-accent text-text hover:bg-accent/90 mt-4 inline-flex min-h-[var(--touch-target-min)] items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>{practiceContact.labels.bookInstantly}</span>
          </a>
        </div>
      </Container>
    </Section>
  );
}
