import { Container } from "@/components/ui/Container";
import { appointmentEnquiryPage } from "@/data/appointment-enquiry";

export function AppointmentHero() {
  return (
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
          {appointmentEnquiryPage.privacyBoundary}
        </p>
      </Container>
    </section>
  );
}
