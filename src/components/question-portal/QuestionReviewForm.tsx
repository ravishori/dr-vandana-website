"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  archiveQuestionAction,
  createAiDraftAction,
  sendResponseAction,
  updateQuestionAction,
} from "@/app/psychologist/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import {
  QUESTION_PRIORITIES,
  QUESTION_STATUSES,
  type QuestionAuditEvent,
  type QuestionSubmissionRecord,
} from "@/types/question-portal";

export function QuestionReviewForm({
  record,
  audit,
}: {
  record: QuestionSubmissionRecord;
  audit: QuestionAuditEvent[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(record.status);
  const [priority, setPriority] = useState(record.priority);
  const [internalNotes, setInternalNotes] = useState(record.internalNotes ?? "");
  const [response, setResponse] = useState(record.psychologistResponse ?? "");
  const [publicationStatus, setPublicationStatus] = useState(
    record.publicationStatus === "PUBLISHED"
      ? "APPROVED_FOR_PUBLICATION"
      : record.publicationStatus,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<{ ok: boolean; message?: string; draft?: string }>) {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setMessage(result.message ?? "The update could not be saved.");
        return;
      }
      if ("draft" in result && result.draft) {
        setMessage("An educational draft was prepared. Review it before sending.");
      } else {
        setMessage("Saved.");
      }
      setConfirmSend(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2>Submission</h2>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-text-muted">Reference</dt>
            <dd>{record.publicReferenceId}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Date</dt>
            <dd>{new Date(record.createdAt).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Category</dt>
            <dd>{record.category ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Consent</dt>
            <dd>{record.consentGiven ? "Given" : "Not given"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Name</dt>
            <dd>{record.name ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Email</dt>
            <dd>{record.email ?? "Not provided"}</dd>
          </div>
        </dl>
        <div>
          <h3 className="text-lg">Question</h3>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{record.question}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2>Professional review</h2>
        <p className="text-text-muted text-sm">
          Internal notes stay in the portal. They are never emailed to the
          submitter.
        </p>
        <AppointmentField id="status" label="Status">
          <select
            id="status"
            className={appointmentControlClassName}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as typeof status)
            }
          >
            {QUESTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </AppointmentField>
        <AppointmentField id="priority" label="Priority">
          <select
            id="priority"
            className={appointmentControlClassName}
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as typeof priority)
            }
          >
            {QUESTION_PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </AppointmentField>
        <AppointmentField id="notes" label="Internal notes">
          <textarea
            id="notes"
            rows={5}
            className={appointmentControlClassName}
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
          />
        </AppointmentField>
        <AppointmentField
          id="publication"
          label="Future educational use"
          helperText="Submissions stay private unless you later approve a de-identified educational version. Nothing is published automatically."
        >
          <select
            id="publication"
            className={appointmentControlClassName}
            value={publicationStatus}
            onChange={(event) =>
              setPublicationStatus(
                event.target.value as typeof publicationStatus,
              )
            }
          >
            <option value="PRIVATE">Private</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="APPROVED_FOR_PUBLICATION">
              Approved for later educational use
            </option>
          </select>
        </AppointmentField>
      </section>

      <section className="space-y-4">
        <h2>Response</h2>
        <AppointmentField
          id="response"
          label="Reply to the submitter"
          helperText="This text may be emailed. Do not include internal notes or a diagnosis."
        >
          <textarea
            id="response"
            rows={8}
            className={appointmentControlClassName}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
          />
        </AppointmentField>
        {record.aiAssistedDraft ? (
          <aside className="border-brand-muted/30 bg-surface-soft rounded-[var(--radius-md)] border p-4 text-sm">
            <p className="font-medium">AI-assisted draft — review required</p>
            <p className="mt-2 whitespace-pre-wrap">{record.aiAssistedDraft}</p>
          </aside>
        ) : null}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={pending}
          className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm"
          onClick={() =>
            run(() =>
              updateQuestionAction({
                publicReferenceId: record.publicReferenceId,
                status: "DRAFT_RESPONSE",
                priority,
                internalNotes,
                psychologistResponse: response,
                publicationStatus,
              }),
            )
          }
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={pending}
          className="border-brand-muted bg-surface text-brand rounded-[var(--radius-md)] border px-4 py-2 text-sm"
          onClick={() =>
            run(() =>
              updateQuestionAction({
                publicReferenceId: record.publicReferenceId,
                status: "UNDER_REVIEW",
                priority,
                internalNotes,
                psychologistResponse: response,
                publicationStatus,
              }),
            )
          }
        >
          Mark under review
        </button>
        <button
          type="button"
          disabled={pending}
          className="border-brand-muted bg-surface text-brand rounded-[var(--radius-md)] border px-4 py-2 text-sm"
          onClick={() =>
            run(() => createAiDraftAction(record.publicReferenceId))
          }
        >
          Prepare educational AI draft
        </button>
        <button
          type="button"
          disabled={pending}
          className="border-brand-muted bg-surface text-brand rounded-[var(--radius-md)] border px-4 py-2 text-sm"
          onClick={() =>
            run(() => archiveQuestionAction(record.publicReferenceId))
          }
        >
          Archive
        </button>
      </div>

      {record.email ? (
        <div className="border-accent/40 rounded-[var(--radius-md)] border p-4">
          <p className="text-sm leading-relaxed">
            Email a reply to {record.email}? Internal notes will not be included.
          </p>
          {confirmSend ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm"
                onClick={() =>
                  run(async () => {
                    await updateQuestionAction({
                      publicReferenceId: record.publicReferenceId,
                      psychologistResponse: response,
                      internalNotes,
                      priority,
                    });
                    return sendResponseAction(record.publicReferenceId);
                  })
                }
              >
                Confirm and send
              </button>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => setConfirmSend(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mt-3 text-sm underline"
              onClick={() => setConfirmSend(true)}
            >
              Respond by email
            </button>
          )}
        </div>
      ) : (
        <p className="text-text-muted text-sm">
          No email was provided, so a written reply cannot be sent from the
          portal.
        </p>
      )}

      <section>
        <h2>Activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.map((event) => (
            <li key={event.id}>
              {new Date(event.createdAt).toLocaleString("en-IN")} · {event.action}{" "}
              · {event.actor}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
