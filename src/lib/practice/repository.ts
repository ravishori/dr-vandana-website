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

export type PracticeState = {
  users: Map<string, PracticeUser>;
  patients: Map<string, PatientProfile>;
  consultationTypes: Map<string, ConsultationType>;
  availabilityRules: Map<string, AvailabilityRule>;
  availabilityExceptions: Map<string, AvailabilityException>;
  appointments: Map<string, Appointment>;
  appointmentEvents: AppointmentStatusEvent[];
  consultations: Map<string, Consultation>;
  notes: Map<string, ConsultationNote>;
  documents: Map<string, PatientDocument>;
  notifications: Map<string, NotificationRecord>;
  audits: AuditEvent[];
  emailVerifications: Map<string, EmailVerification>;
  passwordResets: Map<string, PasswordReset>;
  otpChallenges: Map<string, OtpChallenge>;
  patientSeq: number;
  seeded: boolean;
};

export function createEmptyPracticeState(): PracticeState {
  return {
    users: new Map(),
    patients: new Map(),
    consultationTypes: new Map(),
    availabilityRules: new Map(),
    availabilityExceptions: new Map(),
    appointments: new Map(),
    appointmentEvents: [],
    consultations: new Map(),
    notes: new Map(),
    documents: new Map(),
    notifications: new Map(),
    audits: [],
    emailVerifications: new Map(),
    passwordResets: new Map(),
    otpChallenges: new Map(),
    patientSeq: 1,
    seeded: false,
  };
}

export interface PracticeRepository {
  ensureSeeded(): Promise<void>;
  nextPatientPublicId(): Promise<string>;

  createUser(user: PracticeUser): Promise<PracticeUser>;
  updateUser(user: PracticeUser): Promise<PracticeUser>;
  getUserById(id: string): Promise<PracticeUser | null>;
  getUserByEmail(email: string): Promise<PracticeUser | null>;
  getUserByMobile(mobile: string): Promise<PracticeUser | null>;

  createPatient(patient: PatientProfile): Promise<PatientProfile>;
  updatePatient(patient: PatientProfile): Promise<PatientProfile>;
  getPatientById(id: string): Promise<PatientProfile | null>;
  getPatientByUserId(userId: string): Promise<PatientProfile | null>;
  getPatientByPublicId(publicId: string): Promise<PatientProfile | null>;
  listPatients(): Promise<PatientProfile[]>;

  listConsultationTypes(activeOnly?: boolean): Promise<ConsultationType[]>;
  getConsultationType(id: string): Promise<ConsultationType | null>;

  listAvailabilityRules(): Promise<AvailabilityRule[]>;
  upsertAvailabilityRule(rule: AvailabilityRule): Promise<AvailabilityRule>;
  deleteAvailabilityRule(id: string): Promise<void>;
  listAvailabilityExceptions(): Promise<AvailabilityException[]>;
  upsertAvailabilityException(
    exception: AvailabilityException,
  ): Promise<AvailabilityException>;

  createAppointment(appointment: Appointment): Promise<Appointment>;
  updateAppointment(appointment: Appointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | null>;
  listAppointments(): Promise<Appointment[]>;
  listAppointmentsForPatient(patientId: string): Promise<Appointment[]>;
  findOverlappingConfirmed(
    startsAt: string,
    endsAt: string,
    excludeId?: string,
  ): Promise<Appointment | null>;
  addAppointmentEvent(event: AppointmentStatusEvent): Promise<void>;
  listAppointmentEvents(appointmentId: string): Promise<AppointmentStatusEvent[]>;

  createConsultation(consultation: Consultation): Promise<Consultation>;
  updateConsultation(consultation: Consultation): Promise<Consultation>;
  getConsultation(id: string): Promise<Consultation | null>;
  listConsultationsForPatient(patientId: string): Promise<Consultation[]>;

  createNote(note: ConsultationNote): Promise<ConsultationNote>;
  updateNote(note: ConsultationNote): Promise<ConsultationNote>;
  listNotesForConsultation(consultationId: string): Promise<ConsultationNote[]>;
  getNote(id: string): Promise<ConsultationNote | null>;

  createDocument(doc: PatientDocument): Promise<PatientDocument>;
  getDocument(id: string): Promise<PatientDocument | null>;
  listDocumentsForPatient(patientId: string): Promise<PatientDocument[]>;

  createNotification(notification: NotificationRecord): Promise<NotificationRecord>;
  updateNotification(notification: NotificationRecord): Promise<NotificationRecord>;
  listNotificationsForUser(userId: string): Promise<NotificationRecord[]>;
  findNotificationByIdempotency(
    key: string,
  ): Promise<NotificationRecord | null>;

  addAudit(event: AuditEvent): Promise<void>;
  listAudits(limit?: number): Promise<AuditEvent[]>;

  createEmailVerification(row: EmailVerification): Promise<void>;
  getEmailVerificationByHash(hash: string): Promise<EmailVerification | null>;
  updateEmailVerification(row: EmailVerification): Promise<void>;

  createPasswordReset(row: PasswordReset): Promise<void>;
  getPasswordResetByHash(hash: string): Promise<PasswordReset | null>;
  updatePasswordReset(row: PasswordReset): Promise<void>;

  createOtpChallenge(row: OtpChallenge): Promise<void>;
  getLatestOtpChallenge(userId: string): Promise<OtpChallenge | null>;
  updateOtpChallenge(row: OtpChallenge): Promise<void>;
}
