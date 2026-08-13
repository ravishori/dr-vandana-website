import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  createEmptyPracticeState,
  type PracticeRepository,
  type PracticeState,
} from "@/lib/practice/repository";
import { MemoryPracticeRepository } from "@/lib/practice/memory-store";

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => unknown;
  };
};

function serializeState(state: PracticeState): string {
  return JSON.stringify({
    users: [...state.users.entries()],
    patients: [...state.patients.entries()],
    consultationTypes: [...state.consultationTypes.entries()],
    availabilityRules: [...state.availabilityRules.entries()],
    availabilityExceptions: [...state.availabilityExceptions.entries()],
    appointments: [...state.appointments.entries()],
    appointmentEvents: state.appointmentEvents,
    consultations: [...state.consultations.entries()],
    notes: [...state.notes.entries()],
    documents: [...state.documents.entries()],
    notifications: [...state.notifications.entries()],
    audits: state.audits,
    emailVerifications: [...state.emailVerifications.entries()],
    passwordResets: [...state.passwordResets.entries()],
    otpChallenges: [...state.otpChallenges.entries()],
    patientSeq: state.patientSeq,
    seeded: state.seeded,
  });
}

function hydrateState(raw: string): PracticeState {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const state = createEmptyPracticeState();
  state.users = new Map(parsed.users as Array<[string, never]>);
  state.patients = new Map(parsed.patients as Array<[string, never]>);
  state.consultationTypes = new Map(
    parsed.consultationTypes as Array<[string, never]>,
  );
  state.availabilityRules = new Map(
    parsed.availabilityRules as Array<[string, never]>,
  );
  state.availabilityExceptions = new Map(
    parsed.availabilityExceptions as Array<[string, never]>,
  );
  state.appointments = new Map(parsed.appointments as Array<[string, never]>);
  state.appointmentEvents = (parsed.appointmentEvents as never[]) ?? [];
  state.consultations = new Map(parsed.consultations as Array<[string, never]>);
  state.notes = new Map(parsed.notes as Array<[string, never]>);
  state.documents = new Map(parsed.documents as Array<[string, never]>);
  state.notifications = new Map(parsed.notifications as Array<[string, never]>);
  state.audits = (parsed.audits as never[]) ?? [];
  state.emailVerifications = new Map(
    parsed.emailVerifications as Array<[string, never]>,
  );
  state.passwordResets = new Map(
    parsed.passwordResets as Array<[string, never]>,
  );
  state.otpChallenges = new Map(parsed.otpChallenges as Array<[string, never]>);
  state.patientSeq = Number(parsed.patientSeq ?? 1);
  state.seeded = Boolean(parsed.seeded);
  return state;
}

/**
 * SQLite-backed repository using an atomic snapshot blob.
 * Suitable for a single-practice Node host. Not a multi-writer cluster DB.
 */
export class SqlitePracticeRepository implements PracticeRepository {
  private memory: MemoryPracticeRepository;
  private readonly db: SqliteDatabase;
  private persistQueue: Promise<void> = Promise.resolve();

  constructor(path: string) {
    if (path !== ":memory:") {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.db = new DatabaseSync(path) as unknown as SqliteDatabase;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS practice_snapshot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL
      );
    `);
    const row = this.db
      .prepare("SELECT payload FROM practice_snapshot WHERE id = 1")
      .get() as { payload: string } | undefined;
    const state = row ? hydrateState(row.payload) : createEmptyPracticeState();
    this.memory = new MemoryPracticeRepository(state);
  }

  private persist(): void {
    this.persistQueue = this.persistQueue.then(() => {
      const state = this.memory.state;
      this.db
        .prepare(
          "INSERT OR REPLACE INTO practice_snapshot (id, payload) VALUES (1, ?)",
        )
        .run(serializeState(state));
    });
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    this.persist();
    await this.persistQueue;
    return result;
  }

  ensureSeeded() {
    return this.wrap(() => this.memory.ensureSeeded());
  }
  nextPatientPublicId() {
    return this.wrap(() => this.memory.nextPatientPublicId());
  }
  createUser(...args: Parameters<PracticeRepository["createUser"]>) {
    return this.wrap(() => this.memory.createUser(...args));
  }
  updateUser(...args: Parameters<PracticeRepository["updateUser"]>) {
    return this.wrap(() => this.memory.updateUser(...args));
  }
  getUserById(...args: Parameters<PracticeRepository["getUserById"]>) {
    return this.memory.getUserById(...args);
  }
  getUserByEmail(...args: Parameters<PracticeRepository["getUserByEmail"]>) {
    return this.memory.getUserByEmail(...args);
  }
  getUserByMobile(...args: Parameters<PracticeRepository["getUserByMobile"]>) {
    return this.memory.getUserByMobile(...args);
  }
  createPatient(...args: Parameters<PracticeRepository["createPatient"]>) {
    return this.wrap(() => this.memory.createPatient(...args));
  }
  updatePatient(...args: Parameters<PracticeRepository["updatePatient"]>) {
    return this.wrap(() => this.memory.updatePatient(...args));
  }
  getPatientById(...args: Parameters<PracticeRepository["getPatientById"]>) {
    return this.memory.getPatientById(...args);
  }
  getPatientByUserId(
    ...args: Parameters<PracticeRepository["getPatientByUserId"]>
  ) {
    return this.memory.getPatientByUserId(...args);
  }
  getPatientByPublicId(
    ...args: Parameters<PracticeRepository["getPatientByPublicId"]>
  ) {
    return this.memory.getPatientByPublicId(...args);
  }
  listPatients() {
    return this.memory.listPatients();
  }
  listConsultationTypes(
    ...args: Parameters<PracticeRepository["listConsultationTypes"]>
  ) {
    return this.memory.listConsultationTypes(...args);
  }
  getConsultationType(
    ...args: Parameters<PracticeRepository["getConsultationType"]>
  ) {
    return this.memory.getConsultationType(...args);
  }
  listAvailabilityRules() {
    return this.memory.listAvailabilityRules();
  }
  upsertAvailabilityRule(
    ...args: Parameters<PracticeRepository["upsertAvailabilityRule"]>
  ) {
    return this.wrap(() => this.memory.upsertAvailabilityRule(...args));
  }
  deleteAvailabilityRule(
    ...args: Parameters<PracticeRepository["deleteAvailabilityRule"]>
  ) {
    return this.wrap(() => this.memory.deleteAvailabilityRule(...args));
  }
  listAvailabilityExceptions() {
    return this.memory.listAvailabilityExceptions();
  }
  upsertAvailabilityException(
    ...args: Parameters<PracticeRepository["upsertAvailabilityException"]>
  ) {
    return this.wrap(() => this.memory.upsertAvailabilityException(...args));
  }
  createAppointment(
    ...args: Parameters<PracticeRepository["createAppointment"]>
  ) {
    return this.wrap(() => this.memory.createAppointment(...args));
  }
  updateAppointment(
    ...args: Parameters<PracticeRepository["updateAppointment"]>
  ) {
    return this.wrap(() => this.memory.updateAppointment(...args));
  }
  getAppointment(...args: Parameters<PracticeRepository["getAppointment"]>) {
    return this.memory.getAppointment(...args);
  }
  listAppointments() {
    return this.memory.listAppointments();
  }
  listAppointmentsForPatient(
    ...args: Parameters<PracticeRepository["listAppointmentsForPatient"]>
  ) {
    return this.memory.listAppointmentsForPatient(...args);
  }
  findOverlappingConfirmed(
    ...args: Parameters<PracticeRepository["findOverlappingConfirmed"]>
  ) {
    return this.memory.findOverlappingConfirmed(...args);
  }
  addAppointmentEvent(
    ...args: Parameters<PracticeRepository["addAppointmentEvent"]>
  ) {
    return this.wrap(() => this.memory.addAppointmentEvent(...args));
  }
  listAppointmentEvents(
    ...args: Parameters<PracticeRepository["listAppointmentEvents"]>
  ) {
    return this.memory.listAppointmentEvents(...args);
  }
  createConsultation(
    ...args: Parameters<PracticeRepository["createConsultation"]>
  ) {
    return this.wrap(() => this.memory.createConsultation(...args));
  }
  updateConsultation(
    ...args: Parameters<PracticeRepository["updateConsultation"]>
  ) {
    return this.wrap(() => this.memory.updateConsultation(...args));
  }
  getConsultation(...args: Parameters<PracticeRepository["getConsultation"]>) {
    return this.memory.getConsultation(...args);
  }
  listConsultationsForPatient(
    ...args: Parameters<PracticeRepository["listConsultationsForPatient"]>
  ) {
    return this.memory.listConsultationsForPatient(...args);
  }
  createNote(...args: Parameters<PracticeRepository["createNote"]>) {
    return this.wrap(() => this.memory.createNote(...args));
  }
  updateNote(...args: Parameters<PracticeRepository["updateNote"]>) {
    return this.wrap(() => this.memory.updateNote(...args));
  }
  listNotesForConsultation(
    ...args: Parameters<PracticeRepository["listNotesForConsultation"]>
  ) {
    return this.memory.listNotesForConsultation(...args);
  }
  getNote(...args: Parameters<PracticeRepository["getNote"]>) {
    return this.memory.getNote(...args);
  }
  createDocument(...args: Parameters<PracticeRepository["createDocument"]>) {
    return this.wrap(() => this.memory.createDocument(...args));
  }
  getDocument(...args: Parameters<PracticeRepository["getDocument"]>) {
    return this.memory.getDocument(...args);
  }
  listDocumentsForPatient(
    ...args: Parameters<PracticeRepository["listDocumentsForPatient"]>
  ) {
    return this.memory.listDocumentsForPatient(...args);
  }
  createNotification(
    ...args: Parameters<PracticeRepository["createNotification"]>
  ) {
    return this.wrap(() => this.memory.createNotification(...args));
  }
  updateNotification(
    ...args: Parameters<PracticeRepository["updateNotification"]>
  ) {
    return this.wrap(() => this.memory.updateNotification(...args));
  }
  listNotificationsForUser(
    ...args: Parameters<PracticeRepository["listNotificationsForUser"]>
  ) {
    return this.memory.listNotificationsForUser(...args);
  }
  findNotificationByIdempotency(
    ...args: Parameters<PracticeRepository["findNotificationByIdempotency"]>
  ) {
    return this.memory.findNotificationByIdempotency(...args);
  }
  addAudit(...args: Parameters<PracticeRepository["addAudit"]>) {
    return this.wrap(() => this.memory.addAudit(...args));
  }
  listAudits(...args: Parameters<PracticeRepository["listAudits"]>) {
    return this.memory.listAudits(...args);
  }
  createEmailVerification(
    ...args: Parameters<PracticeRepository["createEmailVerification"]>
  ) {
    return this.wrap(() => this.memory.createEmailVerification(...args));
  }
  getEmailVerificationByHash(
    ...args: Parameters<PracticeRepository["getEmailVerificationByHash"]>
  ) {
    return this.memory.getEmailVerificationByHash(...args);
  }
  updateEmailVerification(
    ...args: Parameters<PracticeRepository["updateEmailVerification"]>
  ) {
    return this.wrap(() => this.memory.updateEmailVerification(...args));
  }
  createPasswordReset(
    ...args: Parameters<PracticeRepository["createPasswordReset"]>
  ) {
    return this.wrap(() => this.memory.createPasswordReset(...args));
  }
  getPasswordResetByHash(
    ...args: Parameters<PracticeRepository["getPasswordResetByHash"]>
  ) {
    return this.memory.getPasswordResetByHash(...args);
  }
  updatePasswordReset(
    ...args: Parameters<PracticeRepository["updatePasswordReset"]>
  ) {
    return this.wrap(() => this.memory.updatePasswordReset(...args));
  }
  createOtpChallenge(
    ...args: Parameters<PracticeRepository["createOtpChallenge"]>
  ) {
    return this.wrap(() => this.memory.createOtpChallenge(...args));
  }
  getLatestOtpChallenge(
    ...args: Parameters<PracticeRepository["getLatestOtpChallenge"]>
  ) {
    return this.memory.getLatestOtpChallenge(...args);
  }
  updateOtpChallenge(
    ...args: Parameters<PracticeRepository["updateOtpChallenge"]>
  ) {
    return this.wrap(() => this.memory.updateOtpChallenge(...args));
  }
}
