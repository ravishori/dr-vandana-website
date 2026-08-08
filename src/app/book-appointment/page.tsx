import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Appointment enquiry page. The booking form will follow in a later milestone.",
};

export default function BookAppointmentPage() {
  return (
    <PlaceholderPage
      title="Book an Appointment"
      description="The appointment enquiry form will be added in a later milestone. No clinical information is requested on this website."
    />
  );
}
