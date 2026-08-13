export const PRACTICE_ROLES = ["PATIENT", "PSYCHOLOGIST", "STAFF"] as const;
export type PracticeRole = (typeof PRACTICE_ROLES)[number];

export const APPOINTMENT_STATUSES = [
  "REQUESTED",
  "PENDING",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "RESCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
  "REJECTED",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const NOTE_VISIBILITY = ["PRIVATE", "PATIENT_VISIBLE"] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITY)[number];

export const DOCUMENT_VISIBILITY = ["PRIVATE", "PATIENT_VISIBLE"] as const;
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITY)[number];

export const NOTIFICATION_CHANNELS = ["EMAIL", "WHATSAPP", "IN_APP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type PracticeUser = {
  id: string;
  email: string;
  mobile: string | null;
  passwordHash: string;
  role: PracticeRole;
  fullName: string;
  emailVerifiedAt: string | null;
  mobileVerifiedAt: string | null;
  mfaEnabled: boolean;
  mfaSecretEnc: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PatientProfile = {
  id: string;
  userId: string;
  publicId: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notificationEmail: boolean;
  notificationWhatsApp: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConsultationType = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  isActive: boolean;
};

export type AvailabilityRule = {
  id: string;
  dayOfWeek: number; // 0=Sun .. 6=Sat Asia/Kolkata
  startTime: string; // HH:mm
  endTime: string;
  consultationTypeId: string | null;
  isActive: boolean;
};

export type AvailabilityException = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  isBlocked: boolean;
  reason: string | null;
};

export type Appointment = {
  id: string;
  publicReference: string;
  patientId: string;
  consultationTypeId: string;
  status: AppointmentStatus;
  startsAt: string; // ISO
  endsAt: string;
  originalStartsAt: string;
  patientNotes: string | null;
  cancellationReason: string | null;
  reschedulePreferredStartsAt: string | null;
  rescheduleReason: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentStatusEvent = {
  id: string;
  appointmentId: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  actorUserId: string;
  note: string | null;
  createdAt: string;
};

export type Consultation = {
  id: string;
  publicId: string;
  patientId: string;
  appointmentId: string | null;
  consultationTypeId: string;
  startsAt: string;
  durationMinutes: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  followUpAt: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ConsultationNote = {
  id: string;
  consultationId: string;
  visibility: NoteVisibility;
  body: string;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type PatientDocument = {
  id: string;
  patientId: string;
  uploadedByUserId: string;
  title: string;
  documentType: string;
  visibility: DocumentVisibility;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  eventType: string;
  subject: string;
  body: string;
  deliveryStatus: "QUEUED" | "SENT" | "FAILED" | "MOCKED";
  readAt: string | null;
  createdAt: string;
  idempotencyKey: string;
};

export type AuditEvent = {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  result: "SUCCESS" | "DENIED" | "ERROR";
  metadata: Record<string, string>;
  createdAt: string;
};

export type EmailVerification = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export type PasswordReset = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export type OtpChallenge = {
  id: string;
  userId: string;
  mobile: string;
  codeHash: string;
  attempts: number;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
};

export type PracticeSession = {
  userId: string;
  email: string;
  role: PracticeRole;
  fullName: string;
  patientId: string | null;
  expiresAt: number;
  sessionId: string;
  mfaVerified: boolean;
};

export type PracticeDashboardStats = {
  todayAppointments: number;
  upcomingConfirmed: number;
  pendingRequests: number;
  rescheduleRequests: number;
  cancellationRequests: number;
  newPatients7d: number;
  followUpsDue: number;
  unreadNotifications: number;
};
