import Link from "next/link";

import { loadPracticeAppointmentsPage } from "@/app/psychologist/practice/appointments/actions";
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
  searchParams: Promise<{ filter?: string; page?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
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
  return (
    <Section className="pt-12 md:pt-16">
      <Container>
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Practice
        </p>
        <h1 className="mt-4">Appointments</h1>
        <p className="text-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Operational appointment management only. Clinical notes and records are
          not part of this view.
        </p>
        <nav aria-label="Appointment filters" className="mt-6 flex flex-wrap gap-2">
          {DASHBOARD_FILTERS.filter((filter) => filter !== "range").map((filter) => {
            const active = result.filter === filter;
            return (
              <Link
                key={filter}
                href={`/psychologist/practice/appointments?filter=${filter}`}
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
                    <td className="py-3 pr-3">{item.patient.displayName}</td>
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
