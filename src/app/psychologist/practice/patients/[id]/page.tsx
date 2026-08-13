import { notFound, redirect } from "next/navigation";

import {
  psychologistAddNoteAction,
  psychologistShareDocumentAction,
  psychologistUploadDocumentAction,
} from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { listNotesForPsychologist } from "@/lib/practice/clinical-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function PracticePatientDetailPage({ params }: PageProps) {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    redirect("/patient/login");
  }
  const { id } = await params;
  const repo = await getPracticeRepository();
  const patient = await repo.getPatientById(id);
  if (!patient) {
    notFound();
  }
  const user = await repo.getUserById(patient.userId);
  const appointments = await repo.listAppointmentsForPatient(patient.id);
  const consultations = await repo.listConsultationsForPatient(patient.id);
  const documents = await repo.listDocumentsForPatient(patient.id);
  const notesByConsultation = await Promise.all(
    consultations.map(async (consultation) => ({
      consultation,
      notes: await listNotesForPsychologist(session, consultation.id),
    })),
  );

  return (
    <Section className="pt-10">
      <Container className="max-w-3xl">
        <ButtonLink href="/psychologist/practice/patients" variant="ghost" className="px-0">
          Back
        </ButtonLink>
        <h1 className="mt-4">
          {patient.publicId} · {user?.fullName}
        </h1>
        <p className="text-text-muted mt-2 text-sm">
          {user?.email} · {user?.mobile}
        </p>

        <h2 className="mt-10 text-xl">Appointments</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {appointments.map((item) => (
            <li key={item.id}>
              {item.publicReference} · {item.status} ·{" "}
              {new Date(item.startsAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl">Consultations & notes</h2>
        {notesByConsultation.map(({ consultation, notes }) => (
          <div key={consultation.id} className="border-brand-muted/30 mt-4 rounded-[var(--radius-lg)] border p-4">
            <p className="text-sm font-medium">{consultation.publicId}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {notes.map((note) => (
                <li key={note.id}>
                  [{note.visibility}] {note.body}
                </li>
              ))}
            </ul>
            <form action={psychologistAddNoteAction} className="mt-4 space-y-2">
              <input type="hidden" name="consultationId" value={consultation.id} />
              <AppointmentField id={`vis-${consultation.id}`} label="Visibility">
                <select name="visibility" className={appointmentControlClassName} defaultValue="PRIVATE">
                  <option value="PRIVATE">PRIVATE (psychologist only)</option>
                  <option value="PATIENT_VISIBLE">PATIENT_VISIBLE</option>
                </select>
              </AppointmentField>
              <textarea name="body" required rows={3} className={appointmentControlClassName} placeholder="Note" />
              <button type="submit" className="bg-accent text-text rounded px-3 py-1.5 text-sm">
                Add note
              </button>
            </form>
          </div>
        ))}

        <h2 className="mt-10 text-xl">Documents</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-3">
              <span>
                {doc.title} · {doc.visibility}
              </span>
              <a href={`/api/practice/documents/${doc.id}`} className="text-brand">
                Download
              </a>
              <form action={psychologistShareDocumentAction}>
                <input type="hidden" name="documentId" value={doc.id} />
                <input
                  type="hidden"
                  name="visibility"
                  value={
                    doc.visibility === "PRIVATE"
                      ? "PATIENT_VISIBLE"
                      : "PRIVATE"
                  }
                />
                <button type="submit" className="text-xs underline">
                  Toggle visibility
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={psychologistUploadDocumentAction} className="mt-4 space-y-2">
          <input type="hidden" name="patientId" value={patient.id} />
          <input name="title" placeholder="Title" className={appointmentControlClassName} required />
          <input name="documentType" placeholder="Type" className={appointmentControlClassName} defaultValue="report" />
          <select name="visibility" className={appointmentControlClassName} defaultValue="PRIVATE">
            <option value="PRIVATE">PRIVATE</option>
            <option value="PATIENT_VISIBLE">PATIENT_VISIBLE</option>
          </select>
          <input name="file" type="file" required />
          <button type="submit" className="bg-accent text-text rounded px-3 py-1.5 text-sm">
            Upload
          </button>
        </form>
      </Container>
    </Section>
  );
}
