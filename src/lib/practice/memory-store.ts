import {
  createEmptyPracticeState,
  type PracticeRepository,
  type PracticeState,
} from "@/lib/practice/repository";
import type {
  Appointment,
  AppointmentStatusEvent,
  AuditEvent,
  AvailabilityException,
  AvailabilityRule,
  Consultation,
  ConsultationNote,
  ConsultationType,
  EmailVerification,
  NotificationRecord,
  OtpChallenge,
  PasswordReset,
  PatientDocument,
  PatientProfile,
  PracticeUser,
} from "@/types/practice";
import { DEFAULT_CONSULTATION_TYPES, DEFAULT_AVAILABILITY } from "@/data/practice/seed";

export class MemoryPracticeRepository implements PracticeRepository {
  constructor(readonly state: PracticeState = createEmptyPracticeState()) {}

  async ensureSeeded(): Promise<void> {
    if (this.state.seeded) {
      return;
    }
    for (const type of DEFAULT_CONSULTATION_TYPES) {
      this.state.consultationTypes.set(type.id, type);
    }
    for (const rule of DEFAULT_AVAILABILITY) {
      this.state.availabilityRules.set(rule.id, rule);
    }
    this.state.seeded = true;
  }

  async nextPatientPublicId(): Promise<string> {
    const id = `PAT-${String(this.state.patientSeq).padStart(6, "0")}`;
    this.state.patientSeq += 1;
    return id;
  }

  async createUser(user: PracticeUser): Promise<PracticeUser> {
    this.state.users.set(user.id, user);
    return user;
  }
  async updateUser(user: PracticeUser): Promise<PracticeUser> {
    this.state.users.set(user.id, user);
    return user;
  }
  async getUserById(id: string): Promise<PracticeUser | null> {
    return this.state.users.get(id) ?? null;
  }
  async getUserByEmail(email: string): Promise<PracticeUser | null> {
    const needle = email.trim().toLowerCase();
    for (const user of this.state.users.values()) {
      if (user.email === needle) {
        return user;
      }
    }
    return null;
  }
  async getUserByMobile(mobile: string): Promise<PracticeUser | null> {
    for (const user of this.state.users.values()) {
      if (user.mobile === mobile) {
        return user;
      }
    }
    return null;
  }

  async createPatient(patient: PatientProfile): Promise<PatientProfile> {
    this.state.patients.set(patient.id, patient);
    return patient;
  }
  async updatePatient(patient: PatientProfile): Promise<PatientProfile> {
    this.state.patients.set(patient.id, patient);
    return patient;
  }
  async getPatientById(id: string): Promise<PatientProfile | null> {
    return this.state.patients.get(id) ?? null;
  }
  async getPatientByUserId(userId: string): Promise<PatientProfile | null> {
    for (const patient of this.state.patients.values()) {
      if (patient.userId === userId) {
        return patient;
      }
    }
    return null;
  }
  async getPatientByPublicId(publicId: string): Promise<PatientProfile | null> {
    for (const patient of this.state.patients.values()) {
      if (patient.publicId === publicId) {
        return patient;
      }
    }
    return null;
  }
  async listPatients(): Promise<PatientProfile[]> {
    return [...this.state.patients.values()].sort((a, b) =>
      a.publicId.localeCompare(b.publicId),
    );
  }

  async listConsultationTypes(activeOnly = false): Promise<ConsultationType[]> {
    return [...this.state.consultationTypes.values()].filter(
      (item) => !activeOnly || item.isActive,
    );
  }
  async getConsultationType(id: string): Promise<ConsultationType | null> {
    return this.state.consultationTypes.get(id) ?? null;
  }

  async listAvailabilityRules(): Promise<AvailabilityRule[]> {
    return [...this.state.availabilityRules.values()];
  }
  async upsertAvailabilityRule(rule: AvailabilityRule): Promise<AvailabilityRule> {
    this.state.availabilityRules.set(rule.id, rule);
    return rule;
  }
  async deleteAvailabilityRule(id: string): Promise<void> {
    this.state.availabilityRules.delete(id);
  }
  async listAvailabilityExceptions(): Promise<AvailabilityException[]> {
    return [...this.state.availabilityExceptions.values()];
  }
  async upsertAvailabilityException(
    exception: AvailabilityException,
  ): Promise<AvailabilityException> {
    this.state.availabilityExceptions.set(exception.id, exception);
    return exception;
  }

  async createAppointment(appointment: Appointment): Promise<Appointment> {
    this.state.appointments.set(appointment.id, appointment);
    return appointment;
  }
  async updateAppointment(appointment: Appointment): Promise<Appointment> {
    this.state.appointments.set(appointment.id, appointment);
    return appointment;
  }
  async getAppointment(id: string): Promise<Appointment | null> {
    return this.state.appointments.get(id) ?? null;
  }
  async listAppointments(): Promise<Appointment[]> {
    return [...this.state.appointments.values()].sort((a, b) =>
      a.startsAt.localeCompare(b.startsAt),
    );
  }
  async listAppointmentsForPatient(patientId: string): Promise<Appointment[]> {
    return (await this.listAppointments()).filter(
      (item) => item.patientId === patientId,
    );
  }
  async findOverlappingConfirmed(
    startsAt: string,
    endsAt: string,
    excludeId?: string,
  ): Promise<Appointment | null> {
    const start = Date.parse(startsAt);
    const end = Date.parse(endsAt);
    for (const appointment of this.state.appointments.values()) {
      if (excludeId && appointment.id === excludeId) {
        continue;
      }
      if (
        ![
          "REQUESTED",
          "PENDING",
          "CONFIRMED",
          "RESCHEDULED",
          "RESCHEDULE_REQUESTED",
        ].includes(appointment.status)
      ) {
        continue;
      }
      const aStart = Date.parse(appointment.startsAt);
      const aEnd = Date.parse(appointment.endsAt);
      if (start < aEnd && end > aStart) {
        return appointment;
      }
    }
    return null;
  }
  async addAppointmentEvent(event: AppointmentStatusEvent): Promise<void> {
    this.state.appointmentEvents.push(event);
  }
  async listAppointmentEvents(
    appointmentId: string,
  ): Promise<AppointmentStatusEvent[]> {
    return this.state.appointmentEvents
      .filter((event) => event.appointmentId === appointmentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createConsultation(consultation: Consultation): Promise<Consultation> {
    this.state.consultations.set(consultation.id, consultation);
    return consultation;
  }
  async updateConsultation(consultation: Consultation): Promise<Consultation> {
    this.state.consultations.set(consultation.id, consultation);
    return consultation;
  }
  async getConsultation(id: string): Promise<Consultation | null> {
    return this.state.consultations.get(id) ?? null;
  }
  async listConsultationsForPatient(patientId: string): Promise<Consultation[]> {
    return [...this.state.consultations.values()]
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }

  async createNote(note: ConsultationNote): Promise<ConsultationNote> {
    this.state.notes.set(note.id, note);
    return note;
  }
  async updateNote(note: ConsultationNote): Promise<ConsultationNote> {
    this.state.notes.set(note.id, note);
    return note;
  }
  async listNotesForConsultation(
    consultationId: string,
  ): Promise<ConsultationNote[]> {
    return [...this.state.notes.values()].filter(
      (note) => note.consultationId === consultationId,
    );
  }
  async getNote(id: string): Promise<ConsultationNote | null> {
    return this.state.notes.get(id) ?? null;
  }

  async createDocument(doc: PatientDocument): Promise<PatientDocument> {
    this.state.documents.set(doc.id, doc);
    return doc;
  }
  async getDocument(id: string): Promise<PatientDocument | null> {
    return this.state.documents.get(id) ?? null;
  }
  async listDocumentsForPatient(patientId: string): Promise<PatientDocument[]> {
    return [...this.state.documents.values()].filter(
      (doc) => doc.patientId === patientId,
    );
  }

  async createNotification(
    notification: NotificationRecord,
  ): Promise<NotificationRecord> {
    this.state.notifications.set(notification.id, notification);
    return notification;
  }
  async updateNotification(
    notification: NotificationRecord,
  ): Promise<NotificationRecord> {
    this.state.notifications.set(notification.id, notification);
    return notification;
  }
  async listNotificationsForUser(
    userId: string,
  ): Promise<NotificationRecord[]> {
    return [...this.state.notifications.values()]
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async findNotificationByIdempotency(
    key: string,
  ): Promise<NotificationRecord | null> {
    for (const item of this.state.notifications.values()) {
      if (item.idempotencyKey === key) {
        return item;
      }
    }
    return null;
  }

  async addAudit(event: AuditEvent): Promise<void> {
    this.state.audits.push(event);
  }
  async listAudits(limit = 100): Promise<AuditEvent[]> {
    return [...this.state.audits]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async createEmailVerification(row: EmailVerification): Promise<void> {
    this.state.emailVerifications.set(row.id, row);
  }
  async getEmailVerificationByHash(
    hash: string,
  ): Promise<EmailVerification | null> {
    for (const row of this.state.emailVerifications.values()) {
      if (row.tokenHash === hash) {
        return row;
      }
    }
    return null;
  }
  async updateEmailVerification(row: EmailVerification): Promise<void> {
    this.state.emailVerifications.set(row.id, row);
  }

  async createPasswordReset(row: PasswordReset): Promise<void> {
    this.state.passwordResets.set(row.id, row);
  }
  async getPasswordResetByHash(hash: string): Promise<PasswordReset | null> {
    for (const row of this.state.passwordResets.values()) {
      if (row.tokenHash === hash) {
        return row;
      }
    }
    return null;
  }
  async updatePasswordReset(row: PasswordReset): Promise<void> {
    this.state.passwordResets.set(row.id, row);
  }

  async createOtpChallenge(row: OtpChallenge): Promise<void> {
    this.state.otpChallenges.set(row.id, row);
  }
  async getLatestOtpChallenge(userId: string): Promise<OtpChallenge | null> {
    return (
      [...this.state.otpChallenges.values()]
        .filter((row) => row.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }
  async updateOtpChallenge(row: OtpChallenge): Promise<void> {
    this.state.otpChallenges.set(row.id, row);
  }
}

const globalState = createEmptyPracticeState();

export function resetMemoryPracticeRepositoryForTests(): void {
  const empty = createEmptyPracticeState();
  Object.assign(globalState, empty);
  globalState.users = new Map();
  globalState.patients = new Map();
  globalState.consultationTypes = new Map();
  globalState.availabilityRules = new Map();
  globalState.availabilityExceptions = new Map();
  globalState.appointments = new Map();
  globalState.appointmentEvents = [];
  globalState.consultations = new Map();
  globalState.notes = new Map();
  globalState.documents = new Map();
  globalState.notifications = new Map();
  globalState.audits = [];
  globalState.emailVerifications = new Map();
  globalState.passwordResets = new Map();
  globalState.otpChallenges = new Map();
}

export function getGlobalMemoryPracticeRepository(): MemoryPracticeRepository {
  return new MemoryPracticeRepository(globalState);
}
