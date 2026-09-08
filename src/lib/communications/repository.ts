import type {
  CommunicationsBundle,
  CommunicationsDashboardStats,
  Conversation,
  ConversationListFilters,
  PaginatedConversations,
} from "@/types/communications";

export type CommunicationsRepository = {
  read(): Promise<CommunicationsBundle>;
  write(bundle: CommunicationsBundle): Promise<void>;
  ensureSeeded(): Promise<void>;
};

export function emptyCommunicationsBundle(): CommunicationsBundle {
  return { version: 1, conversations: [] };
}

export function cloneCommunicationsBundle(
  bundle: CommunicationsBundle,
): CommunicationsBundle {
  return structuredClone(bundle);
}

export function isCommunicationsBundle(
  value: unknown,
): value is CommunicationsBundle {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as CommunicationsBundle;
  return candidate.version === 1 && Array.isArray(candidate.conversations);
}

export function filterConversations(
  conversations: Conversation[],
  filters: ConversationListFilters = {},
): PaginatedConversations {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const search = filters.search?.trim().toLowerCase();

  let items = conversations.filter((conversation) => {
    if (filters.status && conversation.status !== filters.status) {
      return false;
    }
    if (filters.source && conversation.source !== filters.source) {
      return false;
    }
    if (search) {
      const haystack = [
        conversation.userName,
        conversation.userEmail,
        conversation.userPhone ?? "",
        conversation.subject,
        conversation.source,
        ...conversation.messages.map((m) => m.body),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });

  items = [...items].sort(
    (a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt),
  );

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function computeCommunicationsStats(
  conversations: Conversation[],
): CommunicationsDashboardStats {
  return {
    total: conversations.length,
    newCount: conversations.filter((c) => c.status === "NEW").length,
    awaitingReply: conversations.filter((c) => c.status === "AWAITING_REPLY")
      .length,
    replied: conversations.filter((c) => c.status === "REPLIED").length,
    closed: conversations.filter((c) => c.status === "CLOSED").length,
    archived: conversations.filter((c) => c.status === "ARCHIVED").length,
  };
}
