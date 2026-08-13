import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { practiceConfig } from "@/config/practice";
import { audit } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";
import type {
  ConsultationNote,
  NoteVisibility,
  PatientDocument,
  PracticeSession,
} from "@/types/practice";

function assertPsychologist(session: PracticeSession) {
  if (session.role !== "PSYCHOLOGIST") {
    throw new Error("FORBIDDEN");
  }
}

export async function createConsultationFromAppointment(
  session: PracticeSession,
  appointmentId: string,
) {
  assertPsychologist(session);
  const repo = await getPracticeRepository();
  const appointment = await repo.getAppointment(appointmentId);
  if (!appointment) {
    throw new Error("NOT_FOUND");
  }
  const type = await repo.getConsultationType(appointment.consultationTypeId);
  const now = new Date().toISOString();
  const consultation = await repo.createConsultation({
    id: crypto.randomUUID(),
    publicId: `CON-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    consultationTypeId: appointment.consultationTypeId,
    startsAt: appointment.startsAt,
    durationMinutes: type?.durationMinutes ?? 45,
    status: "COMPLETED",
    followUpAt: null,
    createdByUserId: session.userId,
    updatedByUserId: session.userId,
    createdAt: now,
    updatedAt: now,
  });
  await audit(session.userId, "CONSULTATION_CREATED", "consultation", consultation.id, "SUCCESS");
  return consultation;
}

export async function addConsultationNote(
  session: PracticeSession,
  input: {
    consultationId: string;
    visibility: NoteVisibility;
    body: string;
  },
) {
  assertPsychologist(session);
  const repo = await getPracticeRepository();
  const consultation = await repo.getConsultation(input.consultationId);
  if (!consultation) {
    throw new Error("NOT_FOUND");
  }
  const now = new Date().toISOString();
  const note: ConsultationNote = {
    id: crypto.randomUUID(),
    consultationId: input.consultationId,
    visibility: input.visibility,
    body: input.body.slice(0, 8_000),
    createdByUserId: session.userId,
    updatedByUserId: session.userId,
    createdAt: now,
    updatedAt: now,
  };
  await repo.createNote(note);
  await audit(session.userId, "NOTE_CREATED", "consultation_note", note.id, "SUCCESS", {
    visibility: note.visibility,
  });
  return note;
}

export async function listPatientVisibleNotesForPatient(
  session: PracticeSession,
  consultationId: string,
) {
  if (session.role !== "PATIENT" || !session.patientId) {
    throw new Error("FORBIDDEN");
  }
  const repo = await getPracticeRepository();
  const consultation = await repo.getConsultation(consultationId);
  if (!consultation || consultation.patientId !== session.patientId) {
    throw new Error("FORBIDDEN");
  }
  const notes = await repo.listNotesForConsultation(consultationId);
  return notes.filter((note) => note.visibility === "PATIENT_VISIBLE");
}

export async function listNotesForPsychologist(
  session: PracticeSession,
  consultationId: string,
) {
  assertPsychologist(session);
  const repo = await getPracticeRepository();
  return repo.listNotesForConsultation(consultationId);
}

export async function getNoteForRequester(
  session: PracticeSession,
  noteId: string,
) {
  const repo = await getPracticeRepository();
  const note = await repo.getNote(noteId);
  if (!note) {
    throw new Error("NOT_FOUND");
  }
  const consultation = await repo.getConsultation(note.consultationId);
  if (!consultation) {
    throw new Error("NOT_FOUND");
  }
  if (session.role === "PSYCHOLOGIST") {
    await audit(session.userId, "NOTE_ACCESS", "consultation_note", noteId, "SUCCESS");
    return note;
  }
  if (
    session.role === "PATIENT" &&
    session.patientId === consultation.patientId &&
    note.visibility === "PATIENT_VISIBLE"
  ) {
    await audit(session.userId, "NOTE_ACCESS", "consultation_note", noteId, "SUCCESS");
    return note;
  }
  await audit(session.userId, "NOTE_ACCESS", "consultation_note", noteId, "DENIED");
  throw new Error("FORBIDDEN");
}

export async function uploadPatientDocument(
  session: PracticeSession,
  input: {
    patientId: string;
    title: string;
    documentType: string;
    visibility: "PRIVATE" | "PATIENT_VISIBLE";
    filename: string;
    mimeType: string;
    bytes: Buffer;
  },
) {
  assertPsychologist(session);
  if (input.bytes.length > practiceConfig.maxUploadBytes) {
    return { ok: false as const, message: "File exceeds size limit." };
  }
  if (
    !(practiceConfig.allowedMimeTypes as readonly string[]).includes(
      input.mimeType,
    )
  ) {
    return { ok: false as const, message: "File type not allowed." };
  }
  mkdirSync(practiceConfig.documentDir, { recursive: true });
  const storageKey = `${crypto.randomUUID()}.bin`;
  const absolute = join(practiceConfig.documentDir, storageKey);
  writeFileSync(absolute, input.bytes);
  const repo = await getPracticeRepository();
  const doc: PatientDocument = {
    id: crypto.randomUUID(),
    patientId: input.patientId,
    uploadedByUserId: session.userId,
    title: input.title.slice(0, 120),
    documentType: input.documentType.slice(0, 60),
    visibility: input.visibility,
    storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.length,
    createdAt: new Date().toISOString(),
  };
  await repo.createDocument(doc);
  await audit(session.userId, "DOCUMENT_UPLOAD", "document", doc.id, "SUCCESS", {
    visibility: doc.visibility,
  });
  return { ok: true as const, document: doc };
}

export async function readDocumentForRequester(
  session: PracticeSession,
  documentId: string,
): Promise<{ document: PatientDocument; bytes: Buffer }> {
  const repo = await getPracticeRepository();
  const document = await repo.getDocument(documentId);
  if (!document) {
    throw new Error("NOT_FOUND");
  }
  const allowed =
    session.role === "PSYCHOLOGIST" ||
    (session.role === "PATIENT" &&
      session.patientId === document.patientId &&
      document.visibility === "PATIENT_VISIBLE");
  if (!allowed) {
    await audit(session.userId, "DOCUMENT_ACCESS", "document", documentId, "DENIED");
    throw new Error("FORBIDDEN");
  }
  const absolute = join(practiceConfig.documentDir, document.storageKey);
  if (!existsSync(absolute)) {
    throw new Error("NOT_FOUND");
  }
  const bytes = readFileSync(absolute);
  await audit(session.userId, "DOCUMENT_ACCESS", "document", documentId, "SUCCESS");
  return { document, bytes };
}

export async function setDocumentVisibility(
  session: PracticeSession,
  documentId: string,
  visibility: "PRIVATE" | "PATIENT_VISIBLE",
) {
  assertPsychologist(session);
  const repo = await getPracticeRepository();
  const document = await repo.getDocument(documentId);
  if (!document) {
    throw new Error("NOT_FOUND");
  }
  const updated = { ...document, visibility };
  // recreate via createDocument overwrite — repository map set
  await repo.createDocument(updated);
  await audit(session.userId, "DOCUMENT_VISIBILITY", "document", documentId, "SUCCESS", {
    visibility,
  });
  return updated;
}
