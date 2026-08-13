import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

export default async function PatientDocumentsPage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PATIENT" || !session.patientId) {
    redirect("/patient/login");
  }
  const docs = (
    await (
      await getPracticeRepository()
    ).listDocumentsForPatient(session.patientId)
  ).filter((doc) => doc.visibility === "PATIENT_VISIBLE");

  return (
    <Section className="pt-10">
      <Container>
        <h1>My documents</h1>
        <p className="text-text-muted mt-2 text-sm">
          Documents appear here only after they are explicitly shared with you.
        </p>
        <ul className="mt-8 space-y-3">
          {docs.map((doc) => (
            <li key={doc.id} className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4 text-sm">
              <p className="font-medium">{doc.title}</p>
              <p>{doc.documentType}</p>
              <a href={`/api/practice/documents/${doc.id}`} className="text-brand">
                Download
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <ButtonLink href="/patient/dashboard" variant="ghost">
            Back
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
