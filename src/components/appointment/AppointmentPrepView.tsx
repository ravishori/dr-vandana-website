import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { appointmentEnquiryPage } from "@/data/appointment-enquiry";

export function AppointmentPrepView() {
  return (
    <>
      <section
        aria-labelledby="appointment-enquiry-heading"
        className="border-brand-muted/20 border-b"
      >
        <Container className="max-w-3xl py-14 md:py-16 lg:py-20">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            Appointment enquiry
          </p>
          <h1
            id="appointment-enquiry-heading"
            className="mt-4 text-[clamp(2rem,4.5vw,3rem)]"
          >
            {appointmentEnquiryPage.heading}
          </h1>
          <p className="text-text mt-5 text-base leading-relaxed md:text-lg">
            {appointmentEnquiryPage.introduction}
          </p>
          <p className="text-text-muted mt-4 text-base leading-relaxed">
            {appointmentEnquiryPage.statusNote}
          </p>
        </Container>
      </section>

      <Section aria-labelledby="appointment-expectations-heading">
        <Container className="max-w-3xl">
          <h2 id="appointment-expectations-heading">What to expect</h2>
          <ul className="mt-6 space-y-3">
            {appointmentEnquiryPage.expectations.map((item) => (
              <li
                key={item}
                className="text-text flex items-start gap-3 text-base leading-relaxed"
              >
                <span
                  className="bg-brand-muted/50 mt-2 h-2 w-2 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <aside
            className="border-brand-muted/40 bg-surface mt-8 rounded-[var(--radius-lg)] border px-5 py-4"
            aria-label="Privacy boundary"
          >
            <h3 className="font-sans text-sm font-semibold tracking-wide text-[var(--color-brand)] uppercase">
              Privacy boundary
            </h3>
            <p className="text-text mt-3 text-sm leading-relaxed md:text-base">
              {appointmentEnquiryPage.privacyBoundary}
            </p>
          </aside>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled
              className="bg-accent/50 text-text inline-flex min-h-[var(--touch-target-min)] cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium opacity-80"
              aria-label="Appointment enquiry coming soon"
            >
              {appointmentEnquiryPage.primaryCta.label}
            </button>
            <ButtonLink
              href={appointmentEnquiryPage.secondaryCta.href}
              variant="secondary"
            >
              {appointmentEnquiryPage.secondaryCta.label}
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
