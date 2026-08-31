import Link from "next/link";

import { loadPracticePatientsPage } from "@/app/psychologist/practice/actions";
import { PracticeNav } from "@/components/practice/PracticeNav";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { USER_STATUSES } from "@/lib/identity/constants";

export default async function PracticePatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const result = await loadPracticePatientsPage({
    q: params.q,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  if (!result.ok) {
    return (
      <Section className="pt-12 md:pt-16">
        <Container>
          <h1>Patients</h1>
          <p>{result.message}</p>
        </Container>
      </Section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <Section className="pt-12 md:pt-16">
      <Container>
        <PracticeNav current="/psychologist/practice/patients" />
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Practice
        </p>
        <h1 className="mt-4">Patient directory</h1>
        <p className="text-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Non-clinical directory of patients who have booked with this practice.
          Search uses name, email, or patient reference only.
        </p>
        <form
          className="mt-6 flex flex-wrap items-end gap-3 text-sm"
          method="get"
        >
          <label className="flex flex-col gap-1">
            Search
            <input
              name="q"
              defaultValue={params.q}
              className="border-brand-muted/40 rounded border px-3 py-2"
              placeholder="Name, email, or reference"
              maxLength={80}
            />
          </label>
          <label className="flex flex-col gap-1">
            Status
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="border-brand-muted/40 rounded border px-3 py-2"
            >
              <option value="">All</option>
              {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="underline">
            Apply
          </button>
        </form>
        {result.items.length === 0 ? (
          <p className="mt-8 text-sm">No matching patients.</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-brand-muted/30 border-b">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Reference</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Appointments</th>
                  <th className="py-2 pr-3 font-medium">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr
                    key={item.publicId}
                    className="border-brand-muted/20 border-b"
                  >
                    <td className="py-3 pr-3">
                      <Link
                        className="underline"
                        href={`/psychologist/practice/patients/${item.publicId}`}
                      >
                        {item.displayName}
                      </Link>
                    </td>
                    <td className="py-3 pr-3">{item.publicId}</td>
                    <td className="py-3 pr-3">{item.status}</td>
                    <td className="py-3 pr-3">{item.appointmentCount}</td>
                    <td className="py-3 pr-3">
                      {item.whatsappNotificationsEnabled ? "Opted in" : "Off"}
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
                href={`/psychologist/practice/patients?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(params.status ?? "")}&page=${result.page - 1}`}
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
                href={`/psychologist/practice/patients?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(params.status ?? "")}&page=${result.page + 1}`}
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
