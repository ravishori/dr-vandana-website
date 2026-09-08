"use client";

import { useActionState } from "react";

import {
  replyConversationAction,
  type CommunicationsActionState,
} from "@/app/doctor/actions";

const initial: CommunicationsActionState = { ok: false, message: "" };

export function ConversationReplyForm({
  conversationId,
  emailReplyAvailable,
}: {
  conversationId: string;
  emailReplyAvailable: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    replyConversationAction,
    initial,
  );

  if (!emailReplyAvailable) {
    return (
      <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
        <p className="font-medium text-[var(--color-text)]">
          Email reply unavailable
        </p>
        <p>
          This enquiry did not include a valid email address. You can still
          review the conversation here and contact the person by phone or
          WhatsApp. Do not invent an email recipient.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Reply</span>
        <textarea
          name="body"
          required
          rows={6}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          placeholder="Write a professional reply. Do not include clinical chart notes."
        />
      </label>
      {state.message ? (
        <p
          role="status"
          className={`text-sm ${state.ok ? "text-[var(--color-success)]" : "text-[var(--color-emergency)]"}`}
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
      >
        {pending ? "Sending…" : "Save & send reply"}
      </button>
    </form>
  );
}
