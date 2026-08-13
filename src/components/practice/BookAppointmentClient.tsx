"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { bookAppointmentAction, loadSlotsAction } from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

type TypeOption = { id: string; name: string; durationMinutes: number };

export function BookAppointmentClient({ types }: { types: TypeOption[] }) {
  const router = useRouter();
  const [consultationTypeId, setConsultationTypeId] = useState(types[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!date || !consultationTypeId) {
      return;
    }
    startTransition(async () => {
      const next = await loadSlotsAction(date, consultationTypeId);
      setSlots(next);
      setStartsAt("");
    });
  }, [date, consultationTypeId]);

  return (
    <Section className="pt-10">
      <Container className="max-w-xl">
        <h1>Request an appointment</h1>
        <p className="text-text-muted mt-3 text-sm">
          Submitting a request does not confirm the appointment. Dr. Vandana will review availability.
        </p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            formData.set("idempotencyKey", crypto.randomUUID());
            startTransition(async () => {
              const result = await bookAppointmentAction(formData);
              if (!result.ok) {
                setMessage(result.message);
                return;
              }
              router.push("/patient/appointments");
              router.refresh();
            });
          }}
        >
          <AppointmentField id="consultationTypeId" label="Consultation type">
            <select
              id="consultationTypeId"
              name="consultationTypeId"
              className={appointmentControlClassName}
              value={consultationTypeId}
              onChange={(event) => setConsultationTypeId(event.target.value)}
            >
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.durationMinutes} min)
                </option>
              ))}
            </select>
          </AppointmentField>
          <AppointmentField id="date" label="Preferred date">
            <input
              id="date"
              type="date"
              className={appointmentControlClassName}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </AppointmentField>
          <AppointmentField id="startsAt" label="Available slot">
            <select
              id="startsAt"
              name="startsAt"
              required
              className={appointmentControlClassName}
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            >
              <option value="">Select a time</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {new Date(slot).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </option>
              ))}
            </select>
          </AppointmentField>
          <AppointmentField id="patientNotes" label="Optional non-clinical note">
            <textarea id="patientNotes" name="patientNotes" rows={3} className={appointmentControlClassName} />
          </AppointmentField>
          {message ? <p className="text-sm" role="alert">{message}</p> : null}
          <button type="submit" disabled={pending} className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm">
            {pending ? "Submitting…" : "Submit request"}
          </button>
        </form>
      </Container>
    </Section>
  );
}
