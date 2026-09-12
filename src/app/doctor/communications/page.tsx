import Link from "next/link";
import { redirect } from "next/navigation";

import { requireDoctorSession } from "@/lib/doctor-auth";
import { listConversations } from "@/lib/communications/service";
import type { ConversationStatus } from "@/types/communications";
import { CONVERSATION_STATUSES } from "@/types/communications";

type PageProps = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function DoctorCommunicationsPage({
  searchParams,
}: PageProps) {
  let session;
  try {
    session = await requireDoctorSession();
  } catch {
    redirect("/doctor/login");
  }

  const params = await searchParams;
  const status = CONVERSATION_STATUSES.includes(
    params.status as ConversationStatus,
  )
    ? (params.status as ConversationStatus)
    : undefined;

  const result = await listConversations(session, {
    status,
    search: params.q,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl">
          Communications
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Website enquiry inbox — not an EHR or emergency service.
        </p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name, email, subject…"
          className="min-w-[220px] flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {CONVERSATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          Filter
        </button>
      </form>

      <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {result.items.map((conversation) => (
          <li key={conversation.id}>
            <Link
              href={`/doctor/communications/${conversation.id}`}
              className="block px-4 py-4 hover:bg-[var(--color-surface-soft)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-[var(--color-text)]">
                  {conversation.subject}
                </p>
                <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  {conversation.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {conversation.userName} · {conversation.userEmail} ·{" "}
                {new Date(conversation.lastMessageAt).toLocaleString("en-IN")}
              </p>
            </Link>
          </li>
        ))}
        {result.items.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No conversations found.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
