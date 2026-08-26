"use client";

import { useId, useRef, useState, useTransition } from "react";

import { submitPublicQuestionAction } from "@/app/ask-a-question/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { questionPortalCopy } from "@/data/question-portal";
import type { PublicQuestionFormErrors, PublicQuestionFormValues } from "@/lib/question-portal/schema";
import { cn } from "@/lib/utils";

const emptyValues: PublicQuestionFormValues = {
  name: "",
  email: "",
  question: "",
  category: "",
  preferredResponseMethod: "",
  consentGiven: false,
};

export function PublicQuestionForm() {
  const formId = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<PublicQuestionFormErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof PublicQuestionFormValues>(
    key: K,
    value: PublicQuestionFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <Section>
      <Container className="max-w-3xl">
        <div
          ref={summaryRef}
          tabIndex={-1}
          className="space-y-3"
        >
          {message ? (
            <p
              className={cn(
                "rounded-[var(--radius-md)] border px-4 py-3 text-sm leading-relaxed",
                reference
                  ? "border-brand-muted/40 bg-surface-soft"
                  : "border-accent/40 bg-surface",
              )}
              role="status"
            >
              {message}
              {reference ? ` Reference: ${reference}.` : null}
            </p>
          ) : null}
        </div>

        <aside className="border-brand-muted/40 bg-background mt-6 rounded-[var(--radius-lg)] border px-5 py-4">
          <ul className="text-text list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {questionPortalCopy.notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </aside>

        {reference ? null : (
          <form
            className="mt-8 space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await submitPublicQuestionAction({
                  ...values,
                  website: honeypot,
                });
                if (!result.success) {
                  setErrors(result.fieldErrors ?? {});
                  setMessage(result.message);
                  summaryRef.current?.focus();
                  return;
                }
                setErrors({});
                setValues(emptyValues);
                setReference(result.publicReferenceId);
                setMessage(result.message);
                summaryRef.current?.focus();
              });
            }}
          >
            <div className="hidden" aria-hidden="true">
              <label htmlFor={`${formId}-website`}>Website</label>
              <input
                id={`${formId}-website`}
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>

            <AppointmentField id={`${formId}-name`} label="Name (optional)">
              <input
                id={`${formId}-name`}
                className={appointmentControlClassName}
                value={values.name}
                maxLength={80}
                autoComplete="name"
                onChange={(event) => update("name", event.target.value)}
              />
            </AppointmentField>

            <AppointmentField
              id={`${formId}-email`}
              label="Email (optional)"
              error={errors.email}
              helperText="Include an email only if you would like a written reply."
            >
              <input
                id={`${formId}-email`}
                type="email"
                className={appointmentControlClassName}
                value={values.email}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email
                    ? `${formId}-email-error ${formId}-email-helper`
                    : `${formId}-email-helper`
                }
                onChange={(event) => update("email", event.target.value)}
              />
            </AppointmentField>

            <AppointmentField
              id={`${formId}-category`}
              label="Category (optional)"
              error={errors.category}
            >
              <select
                id={`${formId}-category`}
                className={appointmentControlClassName}
                value={values.category}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={
                  errors.category ? `${formId}-category-error` : undefined
                }
                onChange={(event) => update("category", event.target.value)}
              >
                <option value="">Select a category</option>
                {questionPortalCopy.categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </AppointmentField>

            <AppointmentField
              id={`${formId}-method`}
              label="Preferred response method (optional)"
            >
              <select
                id={`${formId}-method`}
                className={appointmentControlClassName}
                value={values.preferredResponseMethod}
                onChange={(event) =>
                  update("preferredResponseMethod", event.target.value)
                }
              >
                <option value="">Select a preference</option>
                {questionPortalCopy.responseMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </AppointmentField>

            <AppointmentField
              id={`${formId}-question`}
              label="Your question"
              required
              error={errors.question}
            >
              <textarea
                id={`${formId}-question`}
                required
                rows={7}
                className={cn(appointmentControlClassName, "resize-y")}
                value={values.question}
                aria-invalid={Boolean(errors.question)}
                aria-describedby={
                  errors.question ? `${formId}-question-error` : undefined
                }
                onChange={(event) => update("question", event.target.value)}
              />
            </AppointmentField>

            <div className="flex items-start gap-3">
              <input
                id={`${formId}-consent`}
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={values.consentGiven}
                aria-invalid={Boolean(errors.consentGiven)}
                onChange={(event) => update("consentGiven", event.target.checked)}
              />
              <label htmlFor={`${formId}-consent`} className="text-sm leading-relaxed">
                {questionPortalCopy.consentLabel}
              </label>
            </div>
            {errors.consentGiven ? (
              <p className="text-sm text-[color:var(--color-brand)]" role="alert">
                {errors.consentGiven}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="bg-accent text-text hover:bg-accent/90 inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium disabled:opacity-60"
            >
              {isPending ? "Submitting…" : "Submit question"}
            </button>
          </form>
        )}
      </Container>
    </Section>
  );
}
