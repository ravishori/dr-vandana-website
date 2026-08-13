import { cookies } from "next/headers";
import { z } from "zod";

import { practiceConfig } from "@/config/practice";
import { getSmtpTransportConfig } from "@/config/appointment-email";
import {
  generateNumericOtp,
  getOtpProvider,
  getWhatsAppProvider,
  hashOpaqueToken,
} from "@/lib/practice/providers";
import {
  createPracticeSessionToken,
  practiceSessionCookieOptions,
  readPracticeSessionToken,
} from "@/lib/practice/session";
import { randomToken, sha256 } from "@/lib/practice/tokens";
import { getPracticeRepository } from "@/lib/practice/store";
import {
  buildOtpAuthUri,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/practice/totp";
import { hashPassword, verifyPassword } from "@/lib/question-portal/password";
import type {
  NotificationRecord,
  PracticeSession,
  PracticeUser,
} from "@/types/practice";
import nodemailer from "nodemailer";

const registerSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().max(120),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  password: z.string().min(10).max(100),
  confirmPassword: z.string().min(10).max(100),
  consentAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
});

export async function getPracticeSession(): Promise<PracticeSession | null> {
  const jar = await cookies();
  return readPracticeSessionToken(
    jar.get(practiceConfig.cookieName)?.value,
  );
}

export async function requirePracticeSession(
  roles?: Array<PracticeSession["role"]>,
): Promise<PracticeSession> {
  const session = await getPracticeSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (roles && !roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  if (session.role === "PSYCHOLOGIST" && !session.mfaVerified) {
    // Allow MFA challenge route; callers that need full access check mfaVerified.
  }
  return session;
}

async function writeSession(sessionInput: {
  userId: string;
  email: string;
  role: PracticeSession["role"];
  fullName: string;
  patientId: string | null;
  mfaVerified: boolean;
}) {
  const token = await createPracticeSessionToken(sessionInput);
  if (!token) {
    throw new Error("SESSION_SECRET_MISSING");
  }
  const jar = await cookies();
  jar.set(
    practiceConfig.cookieName,
    token,
    practiceSessionCookieOptions(sessionInput.role),
  );
}

export async function clearPracticeSession() {
  const jar = await cookies();
  jar.delete(practiceConfig.cookieName);
}

async function audit(
  actorUserId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  result: "SUCCESS" | "DENIED" | "ERROR",
  metadata: Record<string, string> = {},
) {
  const repo = await getPracticeRepository();
  await repo.addAudit({
    id: crypto.randomUUID(),
    actorUserId,
    action,
    targetType,
    targetId,
    result,
    metadata,
    createdAt: new Date().toISOString(),
  });
}

async function queueNotification(input: {
  userId: string;
  channel: NotificationRecord["channel"];
  eventType: string;
  subject: string;
  body: string;
  idempotencyKey: string;
}): Promise<NotificationRecord> {
  const repo = await getPracticeRepository();
  const existing = await repo.findNotificationByIdempotency(input.idempotencyKey);
  if (existing) {
    return existing;
  }
  const record: NotificationRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    channel: input.channel,
    eventType: input.eventType,
    subject: input.subject,
    body: input.body,
    deliveryStatus: "QUEUED",
    readAt: null,
    createdAt: new Date().toISOString(),
    idempotencyKey: input.idempotencyKey,
  };
  await repo.createNotification(record);

  if (input.channel === "EMAIL") {
    const smtp = getSmtpTransportConfig();
    if (!smtp.ok) {
      record.deliveryStatus = "MOCKED";
      await repo.updateNotification(record);
      return record;
    }
    try {
      const user = await repo.getUserById(input.userId);
      if (user) {
        const transporter = nodemailer.createTransport({
          host: smtp.config.host,
          port: smtp.config.port,
          secure: smtp.config.port === 465,
          requireTLS: smtp.config.port === 587,
          auth: { user: smtp.config.user, pass: smtp.config.password },
        });
        await transporter.sendMail({
          from: `${smtp.config.fromName} <${smtp.config.fromEmail}>`,
          to: user.email,
          subject: input.subject,
          text: input.body,
        });
        record.deliveryStatus = "SENT";
      }
    } catch {
      record.deliveryStatus = "FAILED";
    }
    await repo.updateNotification(record);
  } else if (input.channel === "WHATSAPP") {
    const wa = getWhatsAppProvider();
    const result = await wa.sendTransactional("n/a", input.eventType, {});
    record.deliveryStatus = result.mocked ? "MOCKED" : result.ok ? "SENT" : "FAILED";
    await repo.updateNotification(record);
  } else {
    record.deliveryStatus = "SENT";
    await repo.updateNotification(record);
  }
  return record;
}

export async function registerPatient(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Please check the registration fields." };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { ok: false as const, message: "Passwords do not match." };
  }
  const repo = await getPracticeRepository();
  const email = parsed.data.email.trim().toLowerCase();
  if (await repo.getUserByEmail(email)) {
    return {
      ok: false as const,
      message: "This email address is already registered. Please sign in or use another email address.",
    };
  }
  if (await repo.getUserByMobile(parsed.data.mobile)) {
    return {
      ok: false as const,
      message: "This mobile number is already registered. Please sign in or use another number.",
    };
  }
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const patientId = crypto.randomUUID();
  const user: PracticeUser = {
    id: userId,
    email,
    mobile: parsed.data.mobile,
    passwordHash: await hashPassword(parsed.data.password),
    role: "PATIENT",
    fullName: parsed.data.fullName.trim(),
    emailVerifiedAt: null,
    mobileVerifiedAt: null,
    mfaEnabled: false,
    mfaSecretEnc: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await repo.createUser(user);
  await repo.createPatient({
    id: patientId,
    userId,
    publicId: await repo.nextPatientPublicId(),
    dateOfBirth: null,
    gender: null,
    address: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    notificationEmail: true,
    notificationWhatsApp: true,
    createdAt: now,
    updatedAt: now,
  });

  const token = randomToken();
  await repo.createEmailVerification({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashOpaqueToken(token),
    expiresAt: new Date(Date.now() + practiceConfig.emailTokenTtlMs).toISOString(),
    usedAt: null,
    createdAt: now,
  });
  await queueNotification({
    userId,
    channel: "EMAIL",
    eventType: "EMAIL_VERIFICATION",
    subject: "Verify your email — Dr. Vandana practice portal",
    body: `Please verify your email to continue. Verification link: ${practiceConfig.appBaseUrl}/patient/verify-email?token=${token}`,
    idempotencyKey: `email-verify:${userId}:${token.slice(0, 8)}`,
  });
  await audit(userId, "PATIENT_REGISTER", "user", userId, "SUCCESS");
  return { ok: true as const, userId };
}

export async function verifyEmailToken(token: string) {
  const repo = await getPracticeRepository();
  const row = await repo.getEmailVerificationByHash(hashOpaqueToken(token));
  if (!row || row.usedAt || Date.parse(row.expiresAt) < Date.now()) {
    return { ok: false as const, message: "This verification link is invalid or expired." };
  }
  const user = await repo.getUserById(row.userId);
  if (!user) {
    return { ok: false as const, message: "This verification link is invalid or expired." };
  }
  const now = new Date().toISOString();
  await repo.updateUser({ ...user, emailVerifiedAt: now, updatedAt: now });
  await repo.updateEmailVerification({ ...row, usedAt: now });
  await audit(user.id, "EMAIL_VERIFIED", "user", user.id, "SUCCESS");
  return { ok: true as const };
}

export async function sendMobileOtp(userId: string) {
  const repo = await getPracticeRepository();
  const user = await repo.getUserById(userId);
  if (!user?.mobile) {
    return { ok: false as const, message: "No mobile number on file." };
  }
  const latest = await repo.getLatestOtpChallenge(userId);
  if (
    latest &&
    Date.now() - Date.parse(latest.createdAt) < practiceConfig.otpResendCooldownMs
  ) {
    return { ok: false as const, message: "Please wait before requesting another code." };
  }
  const code = generateNumericOtp();
  const now = new Date().toISOString();
  await repo.createOtpChallenge({
    id: crypto.randomUUID(),
    userId,
    mobile: user.mobile,
    codeHash: sha256(code),
    attempts: 0,
    expiresAt: new Date(Date.now() + practiceConfig.otpTtlMs).toISOString(),
    consumedAt: null,
    createdAt: now,
  });
  const provider = getOtpProvider();
  const delivered = await provider.sendOtp(user.mobile, code);
  await audit(userId, "OTP_SENT", "user", userId, "SUCCESS", {
    provider: provider.name,
    mocked: String(delivered.mocked),
  });
  return {
    ok: true as const,
    mocked: delivered.mocked,
    // Dev-only hint when mocked — never returned for non-mock providers.
    devCode: delivered.mocked && process.env.NODE_ENV !== "production" ? code : undefined,
  };
}

export async function verifyMobileOtp(userId: string, code: string) {
  const repo = await getPracticeRepository();
  const challenge = await repo.getLatestOtpChallenge(userId);
  if (!challenge || challenge.consumedAt || Date.parse(challenge.expiresAt) < Date.now()) {
    return { ok: false as const, message: "This code is invalid or expired." };
  }
  if (challenge.attempts >= practiceConfig.otpMaxAttempts) {
    return { ok: false as const, message: "Too many attempts. Request a new code." };
  }
  if (challenge.codeHash !== sha256(code.trim())) {
    await repo.updateOtpChallenge({
      ...challenge,
      attempts: challenge.attempts + 1,
    });
    await audit(userId, "OTP_FAILED", "user", userId, "DENIED");
    return { ok: false as const, message: "This code is invalid or expired." };
  }
  const user = await repo.getUserById(userId);
  if (!user) {
    return { ok: false as const, message: "This code is invalid or expired." };
  }
  const now = new Date().toISOString();
  await repo.updateOtpChallenge({ ...challenge, consumedAt: now });
  await repo.updateUser({ ...user, mobileVerifiedAt: now, updatedAt: now });
  await audit(userId, "OTP_VERIFIED", "user", userId, "SUCCESS");
  return { ok: true as const };
}

export async function loginPracticeUser(input: {
  emailOrMobile: string;
  password: string;
  totp?: string;
}) {
  const repo = await getPracticeRepository();
  const identifier = input.emailOrMobile.trim().toLowerCase();
  const user =
    (await repo.getUserByEmail(identifier)) ??
    (await repo.getUserByMobile(input.emailOrMobile.trim()));
  if (!user || !user.isActive) {
    await audit(null, "LOGIN_FAILED", "user", null, "DENIED");
    return { ok: false as const, message: "Invalid credentials." };
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    await audit(user.id, "LOGIN_FAILED", "user", user.id, "DENIED");
    return { ok: false as const, message: "Invalid credentials." };
  }

  let mfaVerified = true;
  if (user.role === "PSYCHOLOGIST" && user.mfaEnabled) {
    mfaVerified = false;
    if (input.totp && user.mfaSecretEnc && verifyTotp(user.mfaSecretEnc, input.totp)) {
      mfaVerified = true;
    } else if (input.totp) {
      await audit(user.id, "MFA_FAILED", "user", user.id, "DENIED");
      return { ok: false as const, message: "Invalid authenticator code.", needsMfa: true };
    } else {
      await writeSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        patientId: null,
        mfaVerified: false,
      });
      return { ok: false as const, message: "Authenticator code required.", needsMfa: true };
    }
  }

  const patient =
    user.role === "PATIENT" ? await repo.getPatientByUserId(user.id) : null;
  await writeSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    patientId: patient?.id ?? null,
    mfaVerified,
  });
  await audit(user.id, "LOGIN", "user", user.id, "SUCCESS");
  return { ok: true as const, role: user.role, mfaVerified };
}

export async function completeMfa(totp: string) {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    return { ok: false as const, message: "Unauthorized." };
  }
  const repo = await getPracticeRepository();
  const user = await repo.getUserById(session.userId);
  if (!user?.mfaSecretEnc || !verifyTotp(user.mfaSecretEnc, totp)) {
    await audit(session.userId, "MFA_FAILED", "user", session.userId, "DENIED");
    return { ok: false as const, message: "Invalid authenticator code." };
  }
  await writeSession({ ...session, mfaVerified: true });
  await audit(session.userId, "MFA_VERIFIED", "user", session.userId, "SUCCESS");
  return { ok: true as const };
}

export async function enablePsychologistMfa(session: PracticeSession) {
  if (session.role !== "PSYCHOLOGIST") {
    throw new Error("FORBIDDEN");
  }
  const repo = await getPracticeRepository();
  const user = await repo.getUserById(session.userId);
  if (!user) {
    throw new Error("NOT_FOUND");
  }
  const secret = generateTotpSecret();
  const now = new Date().toISOString();
  await repo.updateUser({
    ...user,
    mfaEnabled: true,
    mfaSecretEnc: secret,
    updatedAt: now,
  });
  return {
    secret,
    otpauthUrl: buildOtpAuthUri(secret, user.email, practiceConfig.mfaIssuer),
  };
}

export async function requestPasswordReset(email: string) {
  const repo = await getPracticeRepository();
  const user = await repo.getUserByEmail(email.trim().toLowerCase());
  // Generic response — do not reveal account existence.
  if (user) {
    const token = randomToken();
    await repo.createPasswordReset({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(
        Date.now() + practiceConfig.passwordResetTtlMs,
      ).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    });
    await queueNotification({
      userId: user.id,
      channel: "EMAIL",
      eventType: "PASSWORD_RESET",
      subject: "Password reset — Dr. Vandana practice portal",
      body: `Reset your password: ${practiceConfig.appBaseUrl}/patient/reset-password?token=${token}`,
      idempotencyKey: `pw-reset:${user.id}:${token.slice(0, 8)}`,
    });
  }
  return {
    ok: true as const,
    message: "If an account exists for that email, reset instructions were sent.",
  };
}

export async function resetPassword(token: string, password: string) {
  if (password.length < 10) {
    return { ok: false as const, message: "Password must be at least 10 characters." };
  }
  const repo = await getPracticeRepository();
  const row = await repo.getPasswordResetByHash(hashOpaqueToken(token));
  if (!row || row.usedAt || Date.parse(row.expiresAt) < Date.now()) {
    return { ok: false as const, message: "This reset link is invalid or expired." };
  }
  const user = await repo.getUserById(row.userId);
  if (!user) {
    return { ok: false as const, message: "This reset link is invalid or expired." };
  }
  const now = new Date().toISOString();
  await repo.updateUser({
    ...user,
    passwordHash: await hashPassword(password),
    updatedAt: now,
  });
  await repo.updatePasswordReset({ ...row, usedAt: now });
  await clearPracticeSession();
  await audit(user.id, "PASSWORD_RESET", "user", user.id, "SUCCESS");
  return { ok: true as const };
}

export { queueNotification, audit };
