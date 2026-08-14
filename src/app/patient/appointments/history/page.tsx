import Link from "next/link";

import { loadPatientAppointmentsPage } from "@/app/patient/appointments/actions";
import { PatientAppointmentCard } from "@/components/appointments/PatientAppointmentCard";
import { PatientAppointmentsNav } from "@/components/appointments/PatientAppointmentsNav";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import {
  PATIENT_FILTERS,
  type PatientFilter,
} from "@/lib/appointments/constants";

const HISTORY_FILTERS: { value: PatientFilter; label: string }[] = [
  { value: "history", label: "All history" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
  { value: "no_show", label: "No-show" },
];

function isHistoryFilter(value: string): value is PatientFilter {
  return HISTORY_FILTERS.some((item) => item.value === value);
}

export default async function PatientAppointmentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filter: PatientFilter =
    params.filter &&
    isHistoryFilter(params.filter) &&
    (PATIENT_FILTERS as readonly string[]).includes(params.filter)
      ? params.filter
      : "history";
  const result = await loadPatientAppointmentsPage({
    filter,
    page: params.page ? Number(params.page) : 1,
  });
  if (!result.ok) {
    return (
      <Section className="pt-12 md:pt-16">
        <Container>
          <h1>Appointment history</h1>
          <p>{result.message}</p>
        </Container>
      </Section>
    );
  }
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <Section className="pt-12 md:pt-16">
      <Container className="max-w-3xl">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Patient appointments
        </p>
        <h1 className="mt-4">Appointment history</h1>
        <p className="text-text-muted mt-3 text-sm">
          Completed, cancelled, rejected, and no-show appointments. Times are IST
          (Asia/Kolkata).
        </p>
        <PatientAppointmentsNav active="history" />
        <nav aria-label="History filters" className="mt-4 flex flex-wrap gap-2">
          {HISTORY_FILTERS.map((item) => (
            <Link
              key={item.value}
              href={
                item.value === "history"
                  ? "/patient/appointments/history"
                  : `/patient/appointments/history?filter=${item.value}`
              }
              className={
                filter === item.value
                  ? "bg-accent text-text rounded-full px-3 py-2 text-sm"
                  : "border-brand-muted/40 rounded-full border px-3 py-2 text-sm"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {result.items.length === 0 ? (
          <p className="mt-8 text-sm">Your appointment history will appear here.</p>
        ) : (
          <ul className="mt-8 grid gap-4">
            {result.items.map((item) => (
              <li key={item.publicId}>
                <PatientAppointmentCard appointment={item} />
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 ? (
          <p className="mt-6 flex gap-4 text-sm">
            {result.page > 1 ? (
              <Link
                className="underline"
                href={`/patient/appointments/history?filter=${filter}&page=${result.page - 1}`}
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
                href={`/patient/appointments/history?filter=${filter}&page=${result.page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </p>
        ) : null}
        <p className="mt-8 text-sm">
          <Link className="underline" href="/patient/appointments">
            Back to appointments
          </Link>
        </p>
      </Container>
    </Section>
  );
}
