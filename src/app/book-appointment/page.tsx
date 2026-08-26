import type { Metadata } from "next";

import { AppointmentClosing } from "@/components/appointment/AppointmentClosing";
import { AppointmentForm } from "@/components/appointment/AppointmentForm";
import { AppointmentHero } from "@/components/appointment/AppointmentHero";
import { AppointmentWhatsAppCta } from "@/components/appointment/AppointmentWhatsAppCta";
import { appointmentEnquirySeo } from "@/data/appointment-enquiry";

export const metadata: Metadata = {
  title: appointmentEnquirySeo.title,
  description: appointmentEnquirySeo.description,
  alternates: {
    canonical: "/book-appointment",
  },
  openGraph: {
    title: appointmentEnquirySeo.title.absolute,
    description: appointmentEnquirySeo.description,
    url: "/book-appointment",
  },
};

export default function BookAppointmentPage() {
  return (
    <>
      <AppointmentHero />
      <AppointmentWhatsAppCta />
      <AppointmentForm />
      <AppointmentClosing />
    </>
  );
}
