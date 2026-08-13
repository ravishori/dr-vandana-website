import { redirect } from "next/navigation";

import { BookAppointmentClient } from "@/components/practice/BookAppointmentClient";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { listActiveConsultationTypes } from "@/lib/practice/appointment-service";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PATIENT") {
    redirect("/patient/login");
  }
  const types = await listActiveConsultationTypes();
  return (
    <BookAppointmentClient
      types={types.map((type) => ({
        id: type.id,
        name: type.name,
        durationMinutes: type.durationMinutes,
      }))}
    />
  );
}
