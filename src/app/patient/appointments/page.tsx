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

function isPatientFilter(value: string): value is PatientFilter {
  return (PATIENT_FILTERS as readonly string[]).includes(value);
}

function emptyCopy(filter: PatientFilter | "home"): string {
  if (filter === "pending") {
    return "You don't have any appointment requests awaiting confirmation.";
  }
  if (filter === "history") {
    return "Your appointment history will appear here.";
  }
  if (filter === "upcoming" || filter === "home" || filter === "confirmed") {
    return "You don't have any upcoming appointments.";
  }
  return "No appointments in this view.";
}

export default async function PatientAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    page?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const requested = params.filter && isPatientFilter(params.filter) ? params.filter : null;
  const isHome = requested === null;
  const filter: PatientFilter = requested ?? "upcoming";
  const page = params.page ? Number(params.page) : 1;

  if (isHome) {
    const [upcoming, pending] = await Promise.all([
      loadPatientAppointmentsPage({ filter: "upcoming", page: 1, pageSize: 20 }),
      loadPatientAppointmentsPage({ filter: "pending", page: 1, pageSize: 20 }),
    ]);
    if (!upcoming.ok) {
      return (
        <Section className="pt-12 md:pt-16">
          <Container>
            <h1>Appointments</h1>
            <p>{upcoming.message}</p>
          </Container>
        </Section>
      );
    }
    if (!pending.ok) {
      return (
        <Section className="pt-12 md:pt-16">
          <Container>
            <h1>Appointments</h1>
            <p>{pending.message}</p>
          </Container>
        </Section>
      );
    }
    const upcomingItems = upcoming.items.filter((item) => item.status !== "PENDING");
    return (
      <Section className="pt-12 md:pt-16">
        <Container className="max-w-3xl">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            Patient appointments
          </p>
          <h1 className="mt-4">Your appointments</h1>
          <p className="text-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
            Times are shown in IST (Asia/Kolkata). A pending request is not a
            confirmed appointment. No email, WhatsApp, or SMS is sent in this
            phase.
          </p>
          <PatientAppointmentsNav active="home" />
          <p className="mt-4 text-sm">
            <Link className="underline" href="/patient/appointments/new">
              Request an appointment
            </Link>
          </p>
          <section className="mt-10" aria-labelledby="pending-heading">
            <h2 id="pending-heading" className="text-lg">
              Pending requests
            </h2>
            {pending.items.length === 0 ? (
              <p className="mt-3 text-sm">{emptyCopy("pending")}</p>
            ) : (
              <ul className="mt-4 grid gap-4">
                {pending.items.map((item) => (
                  <li key={item.publicId}>
                    <PatientAppointmentCard appointment={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="mt-10" aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="text-lg">
              Upcoming appointments
            </h2>
            {upcomingItems.length === 0 ? (
              <p className="mt-3 text-sm">{emptyCopy("upcoming")}</p>
            ) : (
              <ul className="mt-4 grid gap-4">
                {upcomingItems.map((item) => (
                  <li key={item.publicId}>
                    <PatientAppointmentCard appointment={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="mt-10 text-sm">
            <Link className="underline" href="/patient/appointments/history">
              View appointment history
            </Link>
          </p>
        </Container>
      </Section>
    );
  }

  const result = await loadPatientAppointmentsPage({
    filter,
    page,
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
      <Container className="max-w-3xl">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Patient appointments
        </p>
        <h1 className="mt-4">Your appointments</h1>
        <PatientAppointmentsNav active={filter} />
        {filter === "range" ? (
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
            <Link href="/patient/appointments?filter=range" className="underline">
              Date range
            </Link>
          </p>
        )}
        {result.items.length === 0 ? (
          <p className="mt-8 text-sm">{emptyCopy(filter)}</p>
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
                href={`/patient/appointments?filter=${result.filter}&page=${result.page - 1}`}
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
                href={`/patient/appointments?filter=${result.filter}&page=${result.page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </p>
        ) : null}
      </Container>
    </Section>
  );
}
