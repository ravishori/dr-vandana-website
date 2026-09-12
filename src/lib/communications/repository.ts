import type {
  CommunicationsBundle,
  CommunicationsDashboardStats,
  Conversation,
  ConversationListFilters,
  PaginatedConversations,
} from "@/types/communications";
import { runOptimisticUpdate } from "@/lib/persistence/optimistic-update";

export type CommunicationsRepository = {
  read(): Promise<CommunicationsBundle>;
  /** Unconditional write — prefer `update` for mutations. */
  write(bundle: CommunicationsBundle): Promise<void>;
  compareAndSet(
    expectedRevision: number,
    next: CommunicationsBundle,
  ): Promise<boolean>;
  update(
    mutator: (
      current: CommunicationsBundle,
    ) => CommunicationsBundle | Promise<CommunicationsBundle>,
  ): Promise<CommunicationsBundle>;
  ensureSeeded(): Promise<void>;
};

export function emptyCommunicationsBundle(): CommunicationsBundle {
  return { version: 1, revision: 0, conversations: [] };
}

export function cloneCommunicationsBundle(
  bundle: CommunicationsBundle,
): CommunicationsBundle {
  return structuredClone(normalizeCommunicationsBundle(bundle));
}

export function normalizeCommunicationsBundle(
  value: CommunicationsBundle,
): CommunicationsBundle {
  return {
    version: 1,
    revision:
      typeof value.revision === "number" && Number.isFinite(value.revision)
        ? value.revision
        : 0,
    conversations: Array.isArray(value.conversations)
      ? value.conversations
      : [],
  };
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

export async function updateCommunicationsBundle(
  repository: Pick<CommunicationsRepository, "read" | "compareAndSet">,
  mutator: (
    current: CommunicationsBundle,
  ) => CommunicationsBundle | Promise<CommunicationsBundle>,
): Promise<CommunicationsBundle> {
  return runOptimisticUpdate({
    read: async () => normalizeCommunicationsBundle(await repository.read()),
    compareAndSet: (expected, next) => repository.compareAndSet(expected, next),
    mutator,
    clone: cloneCommunicationsBundle,
  });
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
