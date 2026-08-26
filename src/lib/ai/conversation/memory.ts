import { aiConfig } from "@/config/ai";
import { stripObviousPii } from "@/lib/ai/safety/post-process";
import type { ConversationTurn } from "@/types/ai";

type ConversationRecord = {
  id: string;
  turns: ConversationTurn[];
  expiresAt: number;
};

const conversations = new Map<string, ConversationRecord>();

function pruneExpired(now = Date.now()): void {
  for (const [id, record] of conversations) {
    if (record.expiresAt <= now) {
      conversations.delete(id);
    }
  }
}

export function createConversationId(): string {
  return crypto.randomUUID();
}

export function getConversation(id: string): ConversationTurn[] {
  pruneExpired();
  const record = conversations.get(id);
  if (!record) {
    return [];
  }
  return record.turns;
}

export function rememberTurn(
  id: string,
  turn: ConversationTurn,
  now = Date.now(),
): void {
  pruneExpired(now);
  const existing = conversations.get(id);
  const sanitized: ConversationTurn = {
    role: turn.role,
    text: stripObviousPii(turn.text).slice(0, 600),
  };

  if (!existing) {
    conversations.set(id, {
      id,
      turns: [sanitized],
      expiresAt: now + aiConfig.conversationTtlMs,
    });
    return;
  }

  existing.turns = [...existing.turns, sanitized].slice(
    -aiConfig.maxConversationTurns,
  );
  existing.expiresAt = now + aiConfig.conversationTtlMs;
}

export function rewriteQuery(
  question: string,
  history: readonly ConversationTurn[],
): string {
  const previousUser = [...history]
    .reverse()
    .find((turn) => turn.role === "user");
  if (!previousUser) {
    return question;
  }

  const looksLikeFollowUp =
    question.length < 80 ||
    /^(what about|and |also |how about|then |the first session|can you (explain|tell)|what happens)/i.test(
      question.trim(),
    ) ||
    /\b(it|that|this|those|these)\b/i.test(question);

  if (!looksLikeFollowUp) {
    return question;
  }

  return `Earlier question: ${previousUser.text}\nFollow-up: ${question}`;
}

/** Test helper — does not run in normal request paths. */
export function resetConversationsForTests(): void {
  conversations.clear();
}
