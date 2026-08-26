import { appointmentEnquiryPage } from "@/data/appointment-enquiry";

export function AppointmentEmergencyNotice() {
  return (
    <aside
      className="border-brand-muted/40 bg-background rounded-[var(--radius-lg)] border px-5 py-4"
      aria-label="Emergency information"
    >
      <p className="text-text text-sm leading-relaxed md:text-base">
        {appointmentEnquiryPage.emergencyNotice}
      </p>
    </aside>
  );
}
