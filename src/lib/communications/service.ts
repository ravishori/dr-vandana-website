import { isBasicEmail } from "@/lib/appointment-form";
import {
  computeCommunicationsStats,
  filterConversations,
} from "@/lib/communications/repository";
import { getCommunicationsEmailSender } from "@/lib/communications/email";
import { getCommunicationsRepository } from "@/lib/communications/store";
import type { DoctorSession } from "@/types/doctor-portal";
import type {
  AppointmentEnquiryForCommunications,
  CommunicationAuditEvent,
  CommunicationMessage,
  CommunicationsDashboardStats,
  Conversation,
  ConversationListFilters,
  ConversationStatus,
  PaginatedConversations,
} from "@/types/communications";

function assertDoctor(session: DoctorSession | null): DoctorSession {
  if (!session || session.role !== "DOCTOR") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeAudit(
  conversationId: string,
  action: string,
  actor: string,
  detail?: string,
): CommunicationAuditEvent {
  return {
    id: crypto.randomUUID(),
    conversationId,
    action,
    actor,
    detail,
    createdAt: nowIso(),
  };
}

function buildEnquiryBody(enquiry: AppointmentEnquiryForCommunications): string {
  const lines = [
    `Name: ${enquiry.fullName}`,
    `Contact method: ${enquiry.contactMethod}`,
    `Contact value: ${enquiry.contactValue}`,
  ];
  if (enquiry.ageGroup) lines.push(`Age group: ${enquiry.ageGroup}`);
  if (enquiry.consultationMode) {
    lines.push(`Consultation mode: ${enquiry.consultationMode}`);
  }
  if (enquiry.preferredDay) lines.push(`Preferred day: ${enquiry.preferredDay}`);
  if (enquiry.preferredTime) {
    lines.push(`Preferred time: ${enquiry.preferredTime}`);
  }
  lines.push("", "Brief reason:", enquiry.briefReason);
  return lines.join("\n");
}

/**
 * Resolve a validated email recipient from an enquiry.
 * Never fabricates a mailbox (no unknown@invalid.local).
 */
export function resolveUserEmail(
  enquiry: AppointmentEnquiryForCommunications,
): string {
  const candidates: string[] = [];
  if (enquiry.contactMethod === "email") {
    candidates.push(enquiry.contactValue);
  } else {
    const value = enquiry.contactValue.trim();
    if (value.includes("@")) {
      candidates.push(value);
    }
  }

  for (const candidate of candidates) {
    const normalized = candidate.trim().toLowerCase();
    if (isBasicEmail(normalized)) {
      return normalized;
    }
  }
  return "";
}

export function resolveUserPhone(
  enquiry: AppointmentEnquiryForCommunications,
): string | null {
  if (enquiry.contactMethod === "phone" || enquiry.contactMethod === "whatsapp") {
    return enquiry.contactValue.trim();
  }
  return null;
}

/** True when the conversation has a deliverable user email address. */
export function conversationHasEmailReplyTarget(
  conversation: Pick<Conversation, "userEmail">,
): boolean {
  return isBasicEmail(conversation.userEmail.trim());
}

/**
 * Persist a conversation + inbound message from a validated appointment enquiry.
 * Sends a doctor notification that excludes full clinical text (name/subject/link only).
 * Notification failure does not roll back persistence.
 */
export async function createEnquiryConversation(
  enquiry: AppointmentEnquiryForCommunications,
): Promise<Conversation> {
  const repo = await getCommunicationsRepository();
  const timestamp = nowIso();
  const conversationId = crypto.randomUUID();
  const userEmail = resolveUserEmail(enquiry);
  const subject = `Appointment enquiry from ${enquiry.fullName}`;

  const inbound: CommunicationMessage = {
    id: crypto.randomUUID(),
    conversationId,
    senderType: "USER",
    senderName: enquiry.fullName.trim(),
    senderEmail: userEmail || enquiry.contactValue.trim(),
    body: buildEnquiryBody(enquiry),
    direction: "INBOUND",
    emailMessageId: null,
    emailDeliveryStatus: "not_applicable",
    createdAt: timestamp,
    readAt: null,
  };

  const conversation: Conversation = {
    id: conversationId,
    userName: enquiry.fullName.trim(),
    userEmail,
    userPhone: resolveUserPhone(enquiry),
    subject,
    status: "NEW",
    source: "appointment_enquiry",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastMessageAt: timestamp,
    assignedTo: null,
    messages: [inbound],
    auditEvents: [
      makeAudit(
        conversationId,
        "CREATED",
        "system",
        userEmail ? "appointment_enquiry" : "appointment_enquiry_no_email",
      ),
    ],
  };

  await repo.update((bundle) => ({
    ...bundle,
    conversations: [conversation, ...bundle.conversations],
  }));

  // Best-effort doctor notification (no full clinical body).
  void getCommunicationsEmailSender()
    .sendDoctorNewEnquiryNotification({ conversation })
    .catch(() => undefined);

  return conversation;
}

export async function listConversations(
  session: DoctorSession | null,
  filters: ConversationListFilters = {},
): Promise<PaginatedConversations> {
  assertDoctor(session);
  const repo = await getCommunicationsRepository();
  const bundle = await repo.read();
  return filterConversations(bundle.conversations, filters);
}

export async function getConversation(
  session: DoctorSession | null,
  id: string,
): Promise<Conversation | null> {
  assertDoctor(session);
  const repo = await getCommunicationsRepository();
  const bundle = await repo.read();
  return bundle.conversations.find((item) => item.id === id) ?? null;
}

export async function getCommunicationsStats(
  session: DoctorSession | null,
): Promise<CommunicationsDashboardStats> {
  assertDoctor(session);
  const repo = await getCommunicationsRepository();
  const bundle = await repo.read();
  return computeCommunicationsStats(bundle.conversations);
}

export async function markConversationRead(
  session: DoctorSession | null,
  id: string,
): Promise<Conversation> {
  const doctor = assertDoctor(session);
  const repo = await getCommunicationsRepository();
  let saved: Conversation | null = null;

  await repo.update((bundle) => {
    const existing = bundle.conversations.find((item) => item.id === id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }
    const timestamp = nowIso();
    const updated: Conversation = {
      ...existing,
      status: existing.status === "NEW" ? "READ" : existing.status,
      updatedAt: timestamp,
      messages: existing.messages.map((message) =>
        message.direction === "INBOUND" && !message.readAt
          ? { ...message, readAt: timestamp }
          : message,
      ),
      auditEvents: [
        ...existing.auditEvents,
        makeAudit(id, "MARKED_READ", doctor.email),
      ],
    };
    saved = updated;
    return {
      ...bundle,
      conversations: bundle.conversations.map((item) =>
        item.id === id ? updated : item,
      ),
    };
  });

  if (!saved) {
    throw new Error("NOT_FOUND");
  }
  return saved;
}

function lastInboundMessageId(conversation: Conversation): string | null {
  for (let i = conversation.messages.length - 1; i >= 0; i -= 1) {
    const message = conversation.messages[i];
    if (message.direction === "INBOUND" && message.emailMessageId) {
      return message.emailMessageId;
    }
  }
  return null;
}

function collectReferences(conversation: Conversation): string | null {
  const ids = conversation.messages
    .map((m) => m.emailMessageId)
    .filter((id): id is string => Boolean(id));
  return ids.length > 0 ? ids.join(" ") : null;
}

/**
 * Save outbound reply FIRST, then attempt email delivery.
 * Never deletes the reply if email fails — update delivery status instead.
 */
export async function replyToConversation(
  session: DoctorSession | null,
  conversationId: string,
  body: string,
): Promise<{ conversation: Conversation; emailOk: boolean }> {
  const doctor = assertDoctor(session);
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 10_000) {
    throw new Error("INVALID_REPLY");
  }

  const repo = await getCommunicationsRepository();
  const existingBundle = await repo.read();
  const existing = existingBundle.conversations.find(
    (item) => item.id === conversationId,
  );
  if (!existing) {
    throw new Error("NOT_FOUND");
  }
  if (!conversationHasEmailReplyTarget(existing)) {
    throw new Error("EMAIL_REPLY_UNAVAILABLE");
  }

  const timestamp = nowIso();
  const messageId = crypto.randomUUID();
  const outbound: CommunicationMessage = {
    id: messageId,
    conversationId,
    senderType: "DOCTOR",
    senderName: doctor.email,
    senderEmail: doctor.email,
    body: trimmed,
    direction: "OUTBOUND",
    emailMessageId: null,
    emailDeliveryStatus: "pending",
    createdAt: timestamp,
    readAt: timestamp,
  };

  let updated: Conversation = {
    ...existing,
    status: "REPLIED",
    updatedAt: timestamp,
    lastMessageAt: timestamp,
    messages: [...existing.messages, outbound],
    auditEvents: [
      ...existing.auditEvents,
      makeAudit(conversationId, "REPLY_SAVED", doctor.email),
    ],
  };

  await repo.update((bundle) => {
    const current = bundle.conversations.find((item) => item.id === conversationId);
    if (!current) {
      throw new Error("NOT_FOUND");
    }
    if (!conversationHasEmailReplyTarget(current)) {
      throw new Error("EMAIL_REPLY_UNAVAILABLE");
    }
    updated = {
      ...current,
      status: "REPLIED",
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      messages: [...current.messages, outbound],
      auditEvents: [
        ...current.auditEvents,
        makeAudit(conversationId, "REPLY_SAVED", doctor.email),
      ],
    };
    return {
      ...bundle,
      conversations: bundle.conversations.map((item) =>
        item.id === conversationId ? updated : item,
      ),
    };
  });

  const inReplyTo = lastInboundMessageId(updated);
  const references = collectReferences(updated);
  const delivery = await getCommunicationsEmailSender().sendUserReply({
    conversation: updated,
    replyBody: trimmed,
    inReplyTo,
    references,
  });

  const deliveryStatus = delivery.ok ? "sent" : "failed";
  await repo.update((bundle) => {
    const current = bundle.conversations.find((item) => item.id === conversationId);
    if (!current) {
      throw new Error("NOT_FOUND");
    }
    updated = {
      ...current,
      messages: current.messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              emailDeliveryStatus: deliveryStatus,
              emailMessageId: delivery.ok
                ? (delivery.messageId ?? message.emailMessageId)
                : message.emailMessageId,
            }
          : message,
      ),
      auditEvents: [
        ...current.auditEvents,
        makeAudit(
          conversationId,
          delivery.ok ? "REPLY_EMAIL_SENT" : "REPLY_EMAIL_FAILED",
          doctor.email,
          delivery.ok ? undefined : delivery.reason,
        ),
      ],
    };
    return {
      ...bundle,
      conversations: bundle.conversations.map((item) =>
        item.id === conversationId ? updated : item,
      ),
    };
  });

  return { conversation: updated, emailOk: delivery.ok };
}

export async function retrySendReply(
  session: DoctorSession | null,
  conversationId: string,
  messageId: string,
): Promise<{ conversation: Conversation; emailOk: boolean }> {
  const doctor = assertDoctor(session);
  const repo = await getCommunicationsRepository();
  const existingBundle = await repo.read();
  const existing = existingBundle.conversations.find(
    (item) => item.id === conversationId,
  );
  if (!existing) {
    throw new Error("NOT_FOUND");
  }
  const message = existing.messages.find((item) => item.id === messageId);
  if (!message || message.direction !== "OUTBOUND") {
    throw new Error("NOT_FOUND");
  }
  if (message.emailDeliveryStatus !== "failed") {
    throw new Error("RETRY_NOT_ALLOWED");
  }
  if (!conversationHasEmailReplyTarget(existing)) {
    throw new Error("EMAIL_REPLY_UNAVAILABLE");
  }

  const inReplyTo = lastInboundMessageId(existing);
  const references = collectReferences(existing);
  const delivery = await getCommunicationsEmailSender().sendUserReply({
    conversation: existing,
    replyBody: message.body,
    inReplyTo,
    references,
  });

  let updated: Conversation = existing;
  await repo.update((bundle) => {
    const current = bundle.conversations.find((item) => item.id === conversationId);
    if (!current) {
      throw new Error("NOT_FOUND");
    }
    const currentMessage = current.messages.find((item) => item.id === messageId);
    if (!currentMessage || currentMessage.direction !== "OUTBOUND") {
      throw new Error("NOT_FOUND");
    }
    if (currentMessage.emailDeliveryStatus !== "failed") {
      throw new Error("RETRY_NOT_ALLOWED");
    }
    if (!conversationHasEmailReplyTarget(current)) {
      throw new Error("EMAIL_REPLY_UNAVAILABLE");
    }

    updated = {
      ...current,
      updatedAt: nowIso(),
      messages: current.messages.map((item) =>
        item.id === messageId
          ? {
              ...item,
              emailDeliveryStatus: delivery.ok ? "sent" : "failed",
              emailMessageId: delivery.ok
                ? (delivery.messageId ?? item.emailMessageId)
                : item.emailMessageId,
            }
          : item,
      ),
      auditEvents: [
        ...current.auditEvents,
        makeAudit(
          conversationId,
          delivery.ok ? "REPLY_EMAIL_RETRY_SENT" : "REPLY_EMAIL_RETRY_FAILED",
          doctor.email,
          delivery.ok ? undefined : delivery.reason,
        ),
      ],
    };
    return {
      ...bundle,
      conversations: bundle.conversations.map((item) =>
        item.id === conversationId ? updated : item,
      ),
    };
  });

  return { conversation: updated, emailOk: delivery.ok };
}

async function setConversationStatus(
  session: DoctorSession | null,
  id: string,
  status: ConversationStatus,
  action: string,
): Promise<Conversation> {
  const doctor = assertDoctor(session);
  const repo = await getCommunicationsRepository();
  let saved: Conversation | null = null;

  await repo.update((bundle) => {
    const existing = bundle.conversations.find((item) => item.id === id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }
    const updated: Conversation = {
      ...existing,
      status,
      updatedAt: nowIso(),
      auditEvents: [
        ...existing.auditEvents,
        makeAudit(id, action, doctor.email, status),
      ],
    };
    saved = updated;
    return {
      ...bundle,
      conversations: bundle.conversations.map((item) =>
        item.id === id ? updated : item,
      ),
    };
  });

  if (!saved) {
    throw new Error("NOT_FOUND");
  }
  return saved;
}

export async function closeConversation(
  session: DoctorSession | null,
  id: string,
): Promise<Conversation> {
  return setConversationStatus(session, id, "CLOSED", "CLOSED");
}

export async function archiveConversation(
  session: DoctorSession | null,
  id: string,
): Promise<Conversation> {
  return setConversationStatus(session, id, "ARCHIVED", "ARCHIVED");
}

export async function reopenConversation(
  session: DoctorSession | null,
  id: string,
): Promise<Conversation> {
  return setConversationStatus(session, id, "AWAITING_REPLY", "REOPENED");
}
