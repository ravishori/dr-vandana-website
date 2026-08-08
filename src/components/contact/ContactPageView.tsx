import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { contactPage } from "@/data/contact";

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

      <Section aria-labelledby="contact-details-heading">
        <Container className="max-w-3xl">
          <h2 id="contact-details-heading">Contact details</h2>
          <p className="text-text-muted mt-3 text-sm">
            The following values are placeholders until verified information is
            confirmed.
          </p>
          <dl className="border-brand-muted/25 bg-surface mt-6 space-y-4 rounded-[var(--radius-xl)] border px-5 py-6">
            <div>
              <dt className="text-text text-sm font-medium">Email</dt>
              <dd className="text-text-muted mt-1 text-sm md:text-base">
                {contactPage.placeholders.email}
              </dd>
            </div>
            <div>
              <dt className="text-text text-sm font-medium">Phone</dt>
              <dd className="text-text-muted mt-1 text-sm md:text-base">
                {contactPage.placeholders.phone}
              </dd>
            </div>
            <div>
              <dt className="text-text text-sm font-medium">WhatsApp</dt>
              <dd className="text-text-muted mt-1 text-sm md:text-base">
                {contactPage.placeholders.whatsapp}
              </dd>
            </div>
            <div>
              <dt className="text-text text-sm font-medium">City</dt>
              <dd className="text-text-muted mt-1 text-sm md:text-base">
                {contactPage.placeholders.city}
              </dd>
            </div>
            <div>
              <dt className="text-text text-sm font-medium">Address</dt>
              <dd className="text-text-muted mt-1 text-sm md:text-base">
                {contactPage.placeholders.address}
              </dd>
            </div>
            <div>
              <dt className="text-text text-sm font-medium">Consultation hours</dt>
              <dd className="text-text-muted mt-1 text-sm md:text-base">
                {contactPage.placeholders.hours}
              </dd>
            </div>
          </dl>
          <aside
            className="border-brand-muted/40 bg-background mt-6 rounded-[var(--radius-lg)] border px-5 py-4"
            aria-label="Privacy reminder"
          >
            <p className="text-text-muted text-sm leading-relaxed">
              {contactPage.privacyNote}
            </p>
          </aside>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={contactPage.primaryCta.href}>
              {contactPage.primaryCta.label}
            </ButtonLink>
            <ButtonLink href={contactPage.secondaryCta.href} variant="secondary">
              {contactPage.secondaryCta.label}
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
