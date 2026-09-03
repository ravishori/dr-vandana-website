"use client";

import Link from "next/link";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { submitAppointmentEnquiry } from "@/app/book-appointment/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { AppointmentEmergencyNotice } from "@/components/appointment/AppointmentEmergencyNotice";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import {
  appointmentConfig,
  appointmentEnquiryPage,
  getEnabledOptions,
} from "@/data/appointment-enquiry";
import {
  appointmentClientValidationSummary,
  appointmentFormFieldOrder,
  emptyAppointmentFormValues,
  getContactFieldLabel,
  validateAppointmentForm,
} from "@/lib/appointment-form";
import type {
  AppointmentActionResult,
  AppointmentFormErrors,
  AppointmentFormValues,
  ContactMethodValue,
} from "@/types/appointment-enquiry";
import { cn } from "@/lib/utils";

function mapServerFieldErrors(
  fieldErrors: NonNullable<
    Extract<AppointmentActionResult, { success: false }>["fieldErrors"]
  >,
): AppointmentFormErrors {
  const next: AppointmentFormErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      next[key as keyof AppointmentFormValues] = messages[0];
    }
  }
  return next;
}

export function AppointmentForm() {
  const formId = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const [values, setValues] = useState<AppointmentFormValues>(
    emptyAppointmentFormValues,
  );
  const [errors, setErrors] = useState<AppointmentFormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [isPending, startTransition] = useTransition();

  const enabledModes = useMemo(
    () => getEnabledOptions(appointmentConfig.consultationModes),
    [],
  );
  const enabledMethods = useMemo(
    () => getEnabledOptions(appointmentConfig.contactMethods),
    [],
  );
  const enabledAgeGroups = useMemo(
    () => getEnabledOptions(appointmentConfig.ageGroups),
    [],
  );
  const enabledDays = useMemo(
    () => getEnabledOptions(appointmentConfig.preferredDays),
    [],
  );
  const enabledTimes = useMemo(
    () => getEnabledOptions(appointmentConfig.preferredTimes),
    [],
  );

  const contactLabel = getContactFieldLabel(values.contactMethod);
  const contactInputType =
    values.contactMethod === "email"
      ? "email"
      : values.contactMethod === "phone" || values.contactMethod === "whatsapp"
        ? "tel"
        : "text";
  const contactAutoComplete =
    values.contactMethod === "email"
      ? "email"
      : values.contactMethod === "phone" || values.contactMethod === "whatsapp"
        ? "tel"
        : "off";

  function focusFirstInvalid(
    nextErrors: AppointmentFormErrors,
  ) {
    const firstKey = appointmentFormFieldOrder.find((key) => nextErrors[key]);
    if (!firstKey) {
      summaryRef.current?.focus();
      return;
    }
    const firstInvalid = document.getElementById(`${formId}-${firstKey}`);
    if (firstInvalid instanceof HTMLElement) {
      firstInvalid.focus();
    } else {
      summaryRef.current?.focus();
    }
  }

  function updateField<K extends keyof AppointmentFormValues>(
    key: K,
    value: AppointmentFormValues[K],
  ) {
    setStatusMessage(null);
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "contactMethod") {
        next.contactValue = "";
      }
      return next;
    });
    setErrors((current) => {
      if (!current[key] && key !== "contactMethod") {
        return current;
      }
      const next = { ...current };
      delete next[key];
      if (key === "contactMethod") {
        delete next.contactValue;
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Block duplicate submissions before React re-renders disabled state.
    if (isPending || submittingRef.current) {
      return;
    }

    const nextErrors = validateAppointmentForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Client validation failed — do not call submitAppointmentEnquiry().
      setStatusMessage(null);
      focusFirstInvalid(nextErrors);
      return;
    }

    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await submitAppointmentEnquiry({
          ...values,
          website: honeypot,
        });

        if (result.success) {
          setErrors({});
          setStatusMessage(result.message);
          summaryRef.current?.focus();
          return;
        }

        const serverErrors = result.fieldErrors
          ? mapServerFieldErrors(result.fieldErrors)
          : {};
        setErrors(serverErrors);
        setStatusMessage(
          Object.keys(serverErrors).length > 0 ? null : result.message,
        );
        if (Object.keys(serverErrors).length > 0) {
          focusFirstInvalid(serverErrors);
        } else {
          summaryRef.current?.focus();
        }
      } finally {
        submittingRef.current = false;
      }
    });
  }

  const errorSummary = Object.values(errors).filter(Boolean);

  return (
    <Section aria-labelledby="appointment-form-heading">
      <Container className="max-w-3xl">
        <h2 id="appointment-form-heading" className="sr-only">
          Appointment enquiry form
        </h2>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="space-y-6"
          aria-describedby={`${formId}-boundary`}
        >
          <p id={`${formId}-boundary`} className="sr-only">
            {appointmentEnquiryPage.privacyBoundary}
          </p>

          {/*
            Honeypot: leave blank. tabIndex=-1 keeps it out of keyboard flow.
            Visually off-screen; label tells assistive tech to ignore it.
          */}
          <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
            <label htmlFor={`${formId}-website`}>
              Leave this field blank
            </label>
            <input
              id={`${formId}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          <div ref={summaryRef} tabIndex={-1} className="space-y-3">
            {errorSummary.length > 0 ? (
              <div
                className="border-brand-muted/50 bg-surface rounded-[var(--radius-lg)] border px-4 py-3"
                role="alert"
              >
                <p className="text-text text-sm font-medium">
                  {appointmentClientValidationSummary}
                </p>
              </div>
            ) : null}
            {statusMessage ? (
              <div
                className="border-accent/50 bg-accent/15 rounded-[var(--radius-lg)] border px-4 py-3"
                role="status"
              >
                <p className="text-text text-sm leading-relaxed">
                  {statusMessage}
                </p>
              </div>
            ) : null}
          </div>

          <AppointmentField
            id={`${formId}-fullName`}
            label="Full name"
            required
            error={errors.fullName}
          >
            <input
              id={`${formId}-fullName`}
              name="fullName"
              type="text"
              autoComplete="name"
              maxLength={appointmentConfig.fullNameMaxLength}
              value={values.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={
                errors.fullName ? `${formId}-fullName-error` : undefined
              }
              className={appointmentControlClassName}
            />
          </AppointmentField>

          <AppointmentField
            id={`${formId}-ageGroup`}
            label="Age group"
            required
            error={errors.ageGroup}
          >
            <select
              id={`${formId}-ageGroup`}
              name="ageGroup"
              value={values.ageGroup}
              onChange={(event) =>
                updateField(
                  "ageGroup",
                  event.target.value as AppointmentFormValues["ageGroup"],
                )
              }
              aria-invalid={Boolean(errors.ageGroup)}
              aria-describedby={
                errors.ageGroup ? `${formId}-ageGroup-error` : undefined
              }
              className={appointmentControlClassName}
            >
              <option value="">Select an age group</option>
              {enabledAgeGroups.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AppointmentField>

          {enabledModes.length > 0 ? (
            <AppointmentField
              id={`${formId}-consultationMode`}
              label="Preferred consultation mode"
              required
              error={errors.consultationMode}
              helperText="This is a preference only and does not confirm availability."
            >
              <select
                id={`${formId}-consultationMode`}
                name="consultationMode"
                value={values.consultationMode}
                onChange={(event) =>
                  updateField(
                    "consultationMode",
                    event.target
                      .value as AppointmentFormValues["consultationMode"],
                  )
                }
                aria-invalid={Boolean(errors.consultationMode)}
                aria-describedby={
                  errors.consultationMode
                    ? `${formId}-consultationMode-error ${formId}-consultationMode-helper`
                    : `${formId}-consultationMode-helper`
                }
                className={appointmentControlClassName}
              >
                <option value="">Select a preferred mode</option>
                {enabledModes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AppointmentField>
          ) : (
            <ConfigUnavailableNotice
              label="Preferred consultation mode"
              message={appointmentEnquiryPage.consultationModesUnavailable}
            />
          )}

          {enabledMethods.length > 0 ? (
            <>
              <AppointmentField
                id={`${formId}-contactMethod`}
                label="Preferred contact method"
                required
                error={errors.contactMethod}
              >
                <select
                  id={`${formId}-contactMethod`}
                  name="contactMethod"
                  value={values.contactMethod}
                  onChange={(event) =>
                    updateField(
                      "contactMethod",
                      event.target.value as ContactMethodValue | "",
                    )
                  }
                  aria-invalid={Boolean(errors.contactMethod)}
                  aria-describedby={
                    errors.contactMethod
                      ? `${formId}-contactMethod-error`
                      : undefined
                  }
                  className={appointmentControlClassName}
                >
                  <option value="">Select a contact method</option>
                  {enabledMethods.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </AppointmentField>

              {values.contactMethod ? (
                <AppointmentField
                  id={`${formId}-contactValue`}
                  label={contactLabel}
                  required
                  error={errors.contactValue}
                >
                  <input
                    id={`${formId}-contactValue`}
                    name="contactValue"
                    type={contactInputType}
                    autoComplete={contactAutoComplete}
                    inputMode={
                      contactInputType === "tel" ? "tel" : undefined
                    }
                    value={values.contactValue}
                    onChange={(event) =>
                      updateField("contactValue", event.target.value)
                    }
                    aria-invalid={Boolean(errors.contactValue)}
                    aria-describedby={
                      errors.contactValue
                        ? `${formId}-contactValue-error`
                        : undefined
                    }
                    className={appointmentControlClassName}
                  />
                </AppointmentField>
              ) : null}
            </>
          ) : (
            <ConfigUnavailableNotice
              label="Preferred contact method"
              message={appointmentEnquiryPage.contactMethodsUnavailable}
            />
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <AppointmentField
              id={`${formId}-preferredDay`}
              label="Preferred day"
              helperText="Optional preference only — not an appointment booking slot."
            >
              <select
                id={`${formId}-preferredDay`}
                name="preferredDay"
                value={values.preferredDay}
                onChange={(event) =>
                  updateField(
                    "preferredDay",
                    event.target
                      .value as AppointmentFormValues["preferredDay"],
                  )
                }
                className={appointmentControlClassName}
              >
                <option value="">Select a preferred day</option>
                {enabledDays.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AppointmentField>

            <AppointmentField
              id={`${formId}-preferredTime`}
              label="Preferred time"
              helperText="Optional preference only — exact times are not listed."
            >
              <select
                id={`${formId}-preferredTime`}
                name="preferredTime"
                value={values.preferredTime}
                onChange={(event) =>
                  updateField(
                    "preferredTime",
                    event.target
                      .value as AppointmentFormValues["preferredTime"],
                  )
                }
                className={appointmentControlClassName}
              >
                <option value="">Select a preferred time</option>
                {enabledTimes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AppointmentField>
          </div>

          <AppointmentField
            id={`${formId}-briefReason`}
            label="Brief reason for enquiry (optional)"
            helperText={appointmentEnquiryPage.briefReasonHelper}
            error={errors.briefReason}
          >
            <textarea
              id={`${formId}-briefReason`}
              name="briefReason"
              rows={4}
              maxLength={appointmentConfig.briefReasonMaxLength}
              value={values.briefReason}
              onChange={(event) =>
                updateField("briefReason", event.target.value)
              }
              aria-invalid={Boolean(errors.briefReason)}
              aria-describedby={
                errors.briefReason
                  ? `${formId}-briefReason-error ${formId}-briefReason-count`
                  : `${formId}-briefReason-helper ${formId}-briefReason-count`
              }
              className={cn(appointmentControlClassName, "min-h-28 resize-y")}
            />
            <p
              id={`${formId}-briefReason-count`}
              className="text-text-muted text-right text-xs"
            >
              {values.briefReason.length} /{" "}
              {appointmentConfig.briefReasonMaxLength}
            </p>
          </AppointmentField>

          <AppointmentEmergencyNotice />

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <input
                id={`${formId}-privacyAccepted`}
                name="privacyAccepted"
                type="checkbox"
                checked={values.privacyAccepted}
                onChange={(event) =>
                  updateField("privacyAccepted", event.target.checked)
                }
                aria-invalid={Boolean(errors.privacyAccepted)}
                aria-describedby={
                  errors.privacyAccepted
                    ? `${formId}-privacyAccepted-error ${formId}-privacyAccepted-label`
                    : `${formId}-privacyAccepted-label`
                }
                className="border-brand-muted text-brand focus-visible:outline-brand mt-1 h-5 w-5 rounded"
              />
              <label
                id={`${formId}-privacyAccepted-label`}
                htmlFor={`${formId}-privacyAccepted`}
                className="text-text text-sm leading-relaxed"
              >
                {appointmentEnquiryPage.privacyAcknowledgement}{" "}
                <Link href="/privacy-policy" className="text-brand">
                  Privacy Policy
                </Link>
                {" · "}
                <Link href="/disclaimer" className="text-brand">
                  Disclaimer
                </Link>
                <span className="text-brand ml-1" aria-hidden="true">
                  *
                </span>
                <span className="sr-only"> (required)</span>
              </label>
            </div>
            {errors.privacyAccepted ? (
              <p
                id={`${formId}-privacyAccepted-error`}
                className="text-sm text-[color:var(--color-brand)]"
              >
                {errors.privacyAccepted}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="bg-accent text-text hover:bg-accent/90 inline-flex min-h-[var(--touch-target-min)] w-full items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {isPending ? "Submitting…" : "Submit Appointment Enquiry"}
          </button>
        </form>
      </Container>
    </Section>
  );
}

function ConfigUnavailableNotice({
  label,
  message,
}: {
  label: string;
  message: string;
}) {
  return (
    <div className="border-brand-muted/30 bg-background rounded-[var(--radius-lg)] border border-dashed px-4 py-4">
      <p className="text-text text-sm font-medium">{label}</p>
      <p className="text-text-muted mt-1 text-sm leading-relaxed">{message}</p>
    </div>
  );
}
