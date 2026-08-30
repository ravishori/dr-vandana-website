import Link from "next/link";

import { loadPracticeAppointmentsPage } from "@/app/psychologist/practice/appointments/actions";
import { PracticeNav } from "@/components/practice/PracticeNav";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import {
  APPOINTMENT_STATUS_LABELS,
  DASHBOARD_FILTERS,
  type DashboardFilter,
} from "@/lib/appointments/constants";

function formatWhen(startIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(startIso));
}

const FILTER_LABELS: Record<DashboardFilter, string> = {
  today: "Today",
  upcoming: "Upcoming",
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  rejected: "Rejected",
  range: "Date range",
};

export default async function PracticeAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    page?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "list";
  const result = await loadPracticeAppointmentsPage({
    filter: params.filter,
    page: params.page ? Number(params.page) : 1,
    fromLocal: params.from,
    toLocal: params.to,
  });
  if (!result.ok) {
    return (
      <Section className="pt-12 md:pt-16">
        <Container>
          <h1>Appointments</h1>
          <p>{result.message}</p>
        </Container>
      </Section>
    );
  }
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const byDay = new Map<string, typeof result.items>();
  for (const item of result.items) {
    const key = item.date;
    const bucket = byDay.get(key) ?? [];
    bucket.push(item);
    byDay.set(key, bucket);
  }
  return (
    <Section className="pt-12 md:pt-16">
      <Container>
        <PracticeNav current="/psychologist/practice/appointments" />
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Practice
        </p>
        <h1 className="mt-4">Appointments</h1>
        <p className="text-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Operational appointment management only. Clinical notes and records are
          not part of this view.
        </p>
        <p className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/psychologist/practice/appointments?filter=${result.filter}&view=list`}
            className={view === "list" ? "underline" : "text-text-muted"}
          >
            List
          </Link>
          <Link
            href={`/psychologist/practice/appointments?filter=${result.filter}&view=week`}
            className={view === "week" ? "underline" : "text-text-muted"}
          >
            Day groups
          </Link>
        </p>
        <nav aria-label="Appointment filters" className="mt-6 flex flex-wrap gap-2">
          {DASHBOARD_FILTERS.filter((filter) => filter !== "range").map((filter) => {
            const active = result.filter === filter;
            return (
              <Link
                key={filter}
                href={`/psychologist/practice/appointments?filter=${filter}&view=${view}`}
                className={
                  active
                    ? "bg-accent text-text rounded-full px-3 py-2 text-sm"
                    : "border-brand-muted/40 rounded-full border px-3 py-2 text-sm"
                }
              >
                {FILTER_LABELS[filter]}
              </Link>
            );
          })}
        </nav>
        {result.filter === "range" ? (
          <form className="mt-4 flex flex-wrap gap-3 text-sm" method="get">
            <input type="hidden" name="filter" value="range" />
            <label>
              From
              <input
                type="date"
                name="from"
                defaultValue={params.from}
                className="border-brand-muted/40 ml-2 rounded border px-2 py-1"
              />
            </label>
            <label>
              To
              <input
                type="date"
                name="to"
                defaultValue={params.to}
                className="border-brand-muted/40 ml-2 rounded border px-2 py-1"
              />
            </label>
            <button type="submit" className="underline">
              Apply
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm">
            <Link href="/psychologist/practice/appointments?filter=range" className="underline">
              Date range
            </Link>
          </p>
        )}
        {result.items.length === 0 ? (
          <p className="mt-8 text-sm">No appointments in this view.</p>
        ) : view === "week" ? (
          <div className="mt-8 space-y-8">
            {[...byDay.entries()].map(([day, items]) => (
              <section key={day} aria-labelledby={`day-${day}`}>
                <h2 id={`day-${day}`} className="text-base font-medium">
                  {day}
                </h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {items.map((item) => (
                    <li
                      key={item.publicId}
                      className="border-brand-muted/25 rounded border px-3 py-3"
                    >
                      <Link
                        className="underline"
                        href={`/psychologist/practice/appointments/${item.publicId}`}
                      >
                        {formatWhen(item.start, item.timezone)}
                      </Link>
                      <span className="text-text-muted">
                        {" "}
                        · {item.patient.displayName} ·{" "}
                        {item.appointmentType.name} ·{" "}
                        {APPOINTMENT_STATUS_LABELS[item.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-brand-muted/30 border-b">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Patient</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 pr-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.publicId} className="border-brand-muted/20 border-b">
                    <td className="py-3 pr-3">{formatWhen(item.start, item.timezone)}</td>
                    <td className="py-3 pr-3">
                      <Link
                        className="underline"
                        href={`/psychologist/practice/patients/${item.patient.publicId}`}
                      >
                        {item.patient.displayName}
                      </Link>
                    </td>
                    <td className="py-3 pr-3">{item.appointmentType.name}</td>
                    <td className="py-3 pr-3">
                      {APPOINTMENT_STATUS_LABELS[item.status]}
                    </td>
                    <td className="py-3 pr-3">
                      {formatWhen(item.createdAt, item.timezone)}
                    </td>
                    <td className="py-3 pr-3">
                      <Link
                        className="underline"
                        href={`/psychologist/practice/appointments/${item.publicId}`}
                      >
                        {item.publicId}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 ? (
          <p className="mt-6 flex gap-4 text-sm">
            {result.page > 1 ? (
              <Link
                className="underline"
                href={`/psychologist/practice/appointments?filter=${result.filter}&page=${result.page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            <span>
              Page {result.page} of {totalPages}
            </span>
            {result.page < totalPages ? (
              <Link
                className="underline"
                href={`/psychologist/practice/appointments?filter=${result.filter}&page=${result.page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </p>
        ) : null}
        <p className="mt-8 text-sm">
          <Link className="underline" href="/psychologist/practice">
            Back to practice home
          </Link>
        </p>
      </Container>
    </Section>
  );
}
