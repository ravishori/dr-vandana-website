import type { Metadata } from "next";

import { AppointmentPrepView } from "@/components/appointment/AppointmentPrepView";
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
  return <AppointmentPrepView />;
}
