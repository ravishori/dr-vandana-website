import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  archiveConversationAction,
  closeConversationAction,
  markReadAction,
  reopenConversationAction,
  retryReplyAction,
} from "@/app/doctor/actions";
import { ConversationReplyForm } from "@/components/doctor/ConversationReplyForm";
import { requireDoctorSession } from "@/lib/doctor-auth";
import { getConversation } from "@/lib/communications/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConversationDetailPage({ params }: PageProps) {
  let session;
  try {
    session = await requireDoctorSession();
  } catch {
    redirect("/doctor/login");
  }

  const { id } = await params;
  const conversation = await getConversation(session, id);
  if (!conversation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/doctor/communications"
          className="text-sm text-[var(--color-brand)] hover:underline"
        >
          ← Back to inbox
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-playfair)] text-3xl">
          {conversation.subject}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {conversation.userName} · {conversation.userEmail}
          {conversation.userPhone ? ` · ${conversation.userPhone}` : ""} ·{" "}
          {conversation.status} · {conversation.source}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={markReadAction}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <button
            type="submit"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            Mark read
          </button>
        </form>
        <form action={closeConversationAction}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <button
            type="submit"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </form>
        <form action={archiveConversationAction}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <button
            type="submit"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            Archive
          </button>
        </form>
        <form action={reopenConversationAction}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <button
            type="submit"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm"
          >
            Reopen
          </button>
        </form>
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl">
          Thread
        </h2>
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-[var(--color-text-muted)]">
              <span>
                {message.senderType} · {message.senderName} ·{" "}
                {message.direction}
              </span>
              <span>
                {new Date(message.createdAt).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[var(--color-text)]">
              {message.body}
            </p>
            {message.direction === "OUTBOUND" ? (
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                <p>Email: {message.emailDeliveryStatus}</p>
                {message.emailDeliveryStatus === "failed" ? (
                  <form action={retryReplyAction} className="mt-2">
                    <input
                      type="hidden"
                      name="conversationId"
                      value={conversation.id}
                    />
                    <input
                      type="hidden"
                      name="messageId"
                      value={message.id}
                    />
                    <button
                      type="submit"
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      Retry send
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <ConversationReplyForm conversationId={conversation.id} />
      </section>
    </div>
  );
}
