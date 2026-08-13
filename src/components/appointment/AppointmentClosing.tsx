import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { appointmentEnquiryPage } from "@/data/appointment-enquiry";

export function AppointmentClosing() {
  return (
    <Section aria-labelledby="appointment-closing-heading" className="pb-16 md:pb-20">
      <Container className="max-w-3xl">
        <h2 id="appointment-closing-heading" className="sr-only">
          About this enquiry
        </h2>
        <p className="text-text-muted text-sm leading-relaxed md:text-base">
          {appointmentEnquiryPage.closing} Registered patients can also{" "}
          <Link href="/patient" className="text-brand">
            request an appointment in the patient portal
          </Link>
          . You can also read the{" "}
          <Link href="/privacy-policy" className="text-brand">
            Privacy Policy
          </Link>{" "}
          or{" "}
          <Link href="/about" className="text-brand">
            About Dr. Vandana
          </Link>
          .
        </p>
      </Container>
    </Section>
  );
}
