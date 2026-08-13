import { redirect } from "next/navigation";

import { blockDateAction, upsertAvailabilityAction } from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

export default async function PracticeCalendarPage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    redirect("/patient/login");
  }
  const repo = await getPracticeRepository();
  const [rules, exceptions, appointments] = await Promise.all([
    repo.listAvailabilityRules(),
    repo.listAvailabilityExceptions(),
    repo.listAppointments(),
  ]);
  const upcomingAppointments = appointments
    .filter((item) =>
      ["REQUESTED", "PENDING", "CONFIRMED", "RESCHEDULED", "RESCHEDULE_REQUESTED"].includes(
        item.status,
      ),
    )
    .slice(0, 30);

  return (
    <Section className="pt-10">
      <Container>
        <h1>Calendar & availability</h1>
        <p className="text-text-muted mt-2 text-sm">Timezone: Asia/Kolkata</p>

        <h2 className="mt-8 text-xl">Upcoming appointments</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {upcomingAppointments.map((item) => (
              <li key={item.id}>
                {new Date(item.startsAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                · {item.publicReference} · {item.status}
              </li>
            ))}
        </ul>

        <h2 className="mt-10 text-xl">Working hours</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {rules.map((rule) => (
            <li key={rule.id}>
              Day {rule.dayOfWeek}: {rule.startTime}–{rule.endTime}{" "}
              {rule.isActive ? "" : "(inactive)"}
            </li>
          ))}
        </ul>
        <form action={upsertAvailabilityAction} className="mt-4 grid max-w-xl gap-2">
          <AppointmentField id="dayOfWeek" label="Day of week (0=Sun)">
            <input name="dayOfWeek" defaultValue="1" className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="startTime" label="Start">
            <input name="startTime" defaultValue="10:00" className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="endTime" label="End">
            <input name="endTime" defaultValue="13:00" className={appointmentControlClassName} />
          </AppointmentField>
          <button type="submit" className="bg-accent text-text rounded px-3 py-2 text-sm">
            Save availability rule
          </button>
        </form>

        <h2 className="mt-10 text-xl">Blocked dates</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {exceptions.map((item) => (
            <li key={item.id}>
              {item.date} · {item.reason}
            </li>
          ))}
        </ul>
        <form action={blockDateAction} className="mt-4 grid max-w-xl gap-2">
          <AppointmentField id="date" label="Date">
            <input name="date" type="date" required className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="reason" label="Reason">
            <input name="reason" className={appointmentControlClassName} />
          </AppointmentField>
          <button type="submit" className="border rounded px-3 py-2 text-sm">
            Block full day
          </button>
        </form>
      </Container>
    </Section>
  );
}
