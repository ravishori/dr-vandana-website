import { redirect } from "next/navigation";

import {
  practiceLogoutAction,
  psychologistApproveRescheduleAction,
  psychologistCancelAction,
  psychologistCompleteAction,
  psychologistConfirmAction,
  psychologistNoShowAction,
  psychologistRejectAction,
} from "@/app/patient/actions";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPsychologistDashboardStats } from "@/lib/practice/appointment-service";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function PsychologistPracticeDashboard() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    redirect("/patient/login");
  }
  if (session.mfaVerified === false) {
    redirect("/psychologist/practice/mfa");
  }
  const stats = await getPsychologistDashboardStats(session);
  const repo = await getPracticeRepository();
  const appointments = await repo.listAppointments();
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const today = appointments.filter((item) => item.startsAt.startsWith(todayKey));
  const requests = appointments.filter((item) =>
    ["REQUESTED", "RESCHEDULE_REQUESTED"].includes(item.status),
  );

  return (
    <Section className="pt-10">
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1>Practice dashboard</h1>
            <p className="text-text-muted mt-2 text-sm">
              Today · appointments, requests, patients
            </p>
          </div>
          <form action={practiceLogoutAction}>
            <button type="submit" className="text-brand text-sm underline">
              Sign out
            </button>
          </form>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Today", stats.todayAppointments],
            ["Upcoming confirmed", stats.upcomingConfirmed],
            ["Pending requests", stats.pendingRequests],
            ["Reschedule requests", stats.rescheduleRequests],
            ["New patients (7d)", stats.newPatients7d],
            ["Follow-ups due", stats.followUpsDue],
          ].map(([label, value]) => (
            <li
              key={String(label)}
              className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4"
            >
              <p className="text-text-muted text-sm">{label}</p>
              <p className="text-brand mt-2 font-serif text-3xl">{value}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/psychologist/practice/patients" variant="secondary">
            Patients
          </ButtonLink>
          <ButtonLink href="/psychologist/practice/calendar" variant="secondary">
            Calendar
          </ButtonLink>
          <ButtonLink href="/psychologist/practice/audit" variant="secondary">
            Audit
          </ButtonLink>
          <ButtonLink href="/psychologist/practice/security" variant="ghost">
            Security / MFA
          </ButtonLink>
        </div>

        <h2 className="mt-12 text-xl">Today</h2>
        <ul className="mt-4 space-y-3">
          {today.length === 0 ? (
            <li className="text-text-muted text-sm">
              No appointments listed for today.
            </li>
          ) : (
            today.map((item) => (
              <li
                key={item.id}
                className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4 text-sm"
              >
                <p className="font-medium">
                  {new Date(item.startsAt).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {item.publicReference} · {item.status}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={psychologistCompleteAction}>
                    <input type="hidden" name="appointmentId" value={item.id} />
                    <button
                      type="submit"
                      className="rounded border px-2 py-1 text-xs"
                    >
                      Complete
                    </button>
                  </form>
                  <form action={psychologistNoShowAction}>
                    <input type="hidden" name="appointmentId" value={item.id} />
                    <button
                      type="submit"
                      className="rounded border px-2 py-1 text-xs"
                    >
                      No-show
                    </button>
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>

        <h2 className="mt-12 text-xl">Requests</h2>
        <ul className="mt-4 space-y-3">
          {requests.map((item) => (
            <li
              key={item.id}
              className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4 text-sm"
            >
              <p className="font-medium">
                {item.publicReference} · {item.status}
              </p>
              <p>
                {new Date(item.startsAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.status === "REQUESTED" ? (
                  <>
                    <form action={psychologistConfirmAction}>
                      <input
                        type="hidden"
                        name="appointmentId"
                        value={item.id}
                      />
                      <button
                        type="submit"
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Confirm
                      </button>
                    </form>
                    <form action={psychologistRejectAction}>
                      <input
                        type="hidden"
                        name="appointmentId"
                        value={item.id}
                      />
                      <button
                        type="submit"
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Reject
                      </button>
                    </form>
                  </>
                ) : null}
                {item.status === "RESCHEDULE_REQUESTED" &&
                item.reschedulePreferredStartsAt ? (
                  <form action={psychologistApproveRescheduleAction}>
                    <input type="hidden" name="appointmentId" value={item.id} />
                    <input
                      type="hidden"
                      name="startsAt"
                      value={item.reschedulePreferredStartsAt}
                    />
                    <button
                      type="submit"
                      className="rounded border px-2 py-1 text-xs"
                    >
                      Approve preferred time
                    </button>
                  </form>
                ) : null}
                <form action={psychologistCancelAction}>
                  <input type="hidden" name="appointmentId" value={item.id} />
                  <input
                    type="hidden"
                    name="reason"
                    value="Cancelled by practice"
                  />
                  <button
                    type="submit"
                    className="rounded border px-2 py-1 text-xs"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
