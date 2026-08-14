import { PatientBookingForm } from "@/components/appointments/PatientBookingForm";
import { requirePatientBookingSession } from "@/app/patient/appointments/actions";
import { generateUuid } from "@/lib/identity/crypto";

export default async function PatientNewAppointmentPage() {
  const session = await requirePatientBookingSession();
  return (
    <PatientBookingForm
      appointmentTypes={session.appointmentTypes}
      todayLocal={session.todayLocal}
      idempotencyKey={generateUuid()}
    />
  );
}
