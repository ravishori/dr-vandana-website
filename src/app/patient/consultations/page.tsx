import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { listPatientVisibleNotesForPatient } from "@/lib/practice/clinical-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

export default async function PatientConsultationsPage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PATIENT" || !session.patientId) {
    redirect("/patient/login");
  }
  const repo = await getPracticeRepository();
  const consultations = await repo.listConsultationsForPatient(session.patientId);
  const rows = await Promise.all(
    consultations.map(async (item) => ({
      item,
      notes: await listPatientVisibleNotesForPatient(session, item.id),
    })),
  );

  return (
    <Section className="pt-10">
      <Container>
        <h1>My consultations</h1>
        <p className="text-text-muted mt-2 text-sm">
          Only notes explicitly shared with you are visible. Private clinical
          notes are never shown here.
        </p>
        <ul className="mt-8 space-y-4">
          {rows.map(({ item, notes }) => (
            <li
              key={item.id}
              className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4 text-sm"
            >
              <p className="font-medium">{item.publicId}</p>
              <p>
                {new Date(item.startsAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </p>
              <p>Status: {item.status}</p>
              {notes.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {notes.map((note) => (
                    <li key={note.id} className="bg-surface-soft rounded p-2">
                      {note.body}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted mt-2">No shared notes yet.</p>
              )}
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
