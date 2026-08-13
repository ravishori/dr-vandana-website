import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { searchPatients } from "@/lib/practice/appointment-service";
import { getPracticeSession } from "@/lib/practice/auth-service";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function PracticePatientsPage({ searchParams }: PageProps) {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    redirect("/patient/login");
  }
  const params = await searchParams;
  const results = await searchPatients(session, params.q ?? "");

  return (
    <Section className="pt-10">
      <Container>
        <h1>Patients</h1>
        <form className="mt-6">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search name, Patient ID, email, mobile"
            className="border-brand-muted/40 w-full max-w-xl rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          />
        </form>
        <ul className="mt-8 space-y-3">
          {results.map((item) => (
            <li key={item.patientId} className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4 text-sm">
              <p className="font-medium">
                {item.publicId} · {item.fullName}
              </p>
              <p>
                {item.email} · {item.mobile}
              </p>
              <ButtonLink
                href={`/psychologist/practice/patients/${item.patientId}`}
                variant="ghost"
                className="px-0"
              >
                Open profile
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
