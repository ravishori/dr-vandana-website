/**
 * Practice communications inbox — enquiry conversations and reply threads.
 * This is not an EHR and must not store clinical charting.
 */

export const CONVERSATION_STATUSES = [
  "NEW",
  "READ",
  "AWAITING_REPLY",
  "REPLIED",
  "CLOSED",
  "ARCHIVED",
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const MESSAGE_SENDER_TYPES = ["USER", "DOCTOR", "SYSTEM"] as const;
export type MessageSenderType = (typeof MESSAGE_SENDER_TYPES)[number];

export const MESSAGE_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

export const EMAIL_DELIVERY_STATUSES = [
  "pending",
  "sent",
  "failed",
  "not_applicable",
] as const;
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];

export const CONVERSATION_SOURCES = [
  "appointment_enquiry",
  "contact_form",
  "manual",
] as const;
export type ConversationSource = (typeof CONVERSATION_SOURCES)[number];

export type CommunicationMessage = {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  senderName: string;
  senderEmail: string;
  body: string;
  direction: MessageDirection;
  emailMessageId: string | null;
  emailDeliveryStatus: EmailDeliveryStatus;
  createdAt: string;
  readAt: string | null;
};

export type CommunicationAuditEvent = {
  id: string;
  conversationId: string;
  action: string;
  actor: string;
  detail?: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  subject: string;
  status: ConversationStatus;
  source: ConversationSource;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  assignedTo: string | null;
  messages: CommunicationMessage[];
  auditEvents: CommunicationAuditEvent[];
};

export type CommunicationsBundle = {
  /** Schema version for the document shape. */
  version: 1;
  /**
   * Optimistic concurrency token. Incremented on every successful write.
   * Missing/legacy documents are treated as revision 0.
   */
  revision: number;
  conversations: Conversation[];
};

export type ConversationListFilters = {
  status?: ConversationStatus;
  source?: ConversationSource;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedConversations = {
  items: Conversation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CommunicationsDashboardStats = {
  total: number;
  newCount: number;
  awaitingReply: number;
  replied: number;
  closed: number;
  archived: number;
};

/** Minimal appointment payload used to open an enquiry conversation. */
export type AppointmentEnquiryForCommunications = {
  fullName: string;
  contactMethod: string;
  contactValue: string;
  preferredDay?: string;
  preferredTime?: string;
  consultationMode?: string;
  ageGroup?: string;
  briefReason: string;
};
