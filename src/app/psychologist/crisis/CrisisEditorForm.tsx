"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveCrisisResourceAction } from "@/app/psychologist/crisis/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { crisisCategoryLabels } from "@/data/crisis/seed";
import {
  CRISIS_CATEGORIES,
  CRISIS_EMERGENCY_LEVELS,
  CRISIS_ORGANIZATION_TYPES,
  CRISIS_VERIFICATION_STATUSES,
  type CrisisResource,
} from "@/types/crisis";

type CrisisEditorFormProps = {
  initial?: CrisisResource | null;
};

export function CrisisEditorForm({ initial }: CrisisEditorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [shortName, setShortName] = useState(initial?.shortName ?? "");
  const [category, setCategory] = useState(
    initial?.category ?? "MENTAL_HEALTH_CRISIS",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [purposeNote, setPurposeNote] = useState(initial?.purposeNote ?? "");
  const [phonesJson, setPhonesJson] = useState(
    JSON.stringify(initial?.phoneNumbers ?? [], null, 2),
  );
  const [emergencyLevel, setEmergencyLevel] = useState(
    initial?.emergencyLevel ?? "MENTAL_HEALTH_CRISIS",
  );
  const [availability, setAvailability] = useState(
    initial?.availability ?? "24×7",
  );
  const [coverage, setCoverage] = useState(initial?.coverage ?? "India");
  const [organization, setOrganization] = useState(
    initial?.organization ?? "",
  );
  const [organizationType, setOrganizationType] = useState(
    initial?.organizationType ?? "GOVERNMENT_OF_INDIA",
  );
  const [officialSourceUrl, setOfficialSourceUrl] = useState(
    initial?.officialSourceUrl ?? "",
  );
  const [officialWebsite, setOfficialWebsite] = useState(
    initial?.officialWebsite ?? "",
  );
  const [sourceTitle, setSourceTitle] = useState(initial?.sourceTitle ?? "");
  const [sourceAuthority, setSourceAuthority] = useState(
    initial?.sourceAuthority ?? "",
  );
  const [sourceVerifiedAt, setSourceVerifiedAt] = useState(
    initial?.sourceVerifiedAt ?? "",
  );
  const [nextVerificationDueAt, setNextVerificationDueAt] = useState(
    initial?.nextVerificationDueAt ?? "",
  );
  const [verificationStatus, setVerificationStatus] = useState(
    initial?.verificationStatus ?? "NEEDS_REVIEW",
  );
  const [verificationNotes, setVerificationNotes] = useState(
    initial?.verificationNotes ?? "",
  );
  const [displayOrder, setDisplayOrder] = useState(
    String(initial?.displayOrder ?? 100),
  );
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          let phoneNumbers = [];
          try {
            phoneNumbers = JSON.parse(phonesJson) as CrisisResource["phoneNumbers"];
          } catch {
            setMessage("Phone numbers JSON is invalid.");
            return;
          }
          const result = await saveCrisisResourceAction({
            id: initial?.id,
            name,
            slug,
            shortName,
            category,
            description,
            purposeNote,
            phoneNumbers,
            emergencyLevel,
            availability,
            languages: initial?.languages ?? [],
            coverage,
            country: "India",
            state: initial?.state ?? null,
            district: initial?.district ?? null,
            organization,
            organizationType,
            officialSourceUrl,
            officialWebsite: officialWebsite || null,
            sourceTitle,
            sourceAuthority,
            sourceVerifiedAt,
            nextVerificationDueAt,
            verificationStatus,
            verificationNotes,
            displayOrder: Number.parseInt(displayOrder, 10) || 100,
            isFeatured,
            isActive,
          });
          if (!result.ok) {
            setMessage(result.message);
            return;
          }
          setMessage("Saved.");
          router.push(`/psychologist/crisis/${result.slug}`);
          router.refresh();
        });
      }}
    >
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}

      <p className="text-text-muted text-sm leading-relaxed">
        Only add numbers and URLs you have personally verified against an
        official government or authorized source. Do not paste blog helpline
        lists. Publishing requires verification status VERIFIED, active flag,
        and an https official source URL.
      </p>

      <AppointmentField id="name" label="Service name" required>
        <input
          id="name"
          required
          className={appointmentControlClassName}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="slug" label="Slug" required>
        <input
          id="slug"
          required
          className={appointmentControlClassName}
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="short" label="Short name" required>
        <input
          id="short"
          required
          className={appointmentControlClassName}
          value={shortName}
          onChange={(event) => setShortName(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="category" label="Category">
        <select
          id="category"
          className={appointmentControlClassName}
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as typeof category)
          }
        >
          {CRISIS_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {crisisCategoryLabels[item]}
            </option>
          ))}
        </select>
      </AppointmentField>
      <AppointmentField id="purpose" label="Purpose note" required>
        <input
          id="purpose"
          required
          className={appointmentControlClassName}
          value={purposeNote}
          onChange={(event) => setPurposeNote(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="description" label="Description" required>
        <textarea
          id="description"
          required
          rows={5}
          className={appointmentControlClassName}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField
        id="phones"
        label="Phone numbers JSON"
        helperText='[{"display":"14416","tel":"14416","label":"Primary","isPrimary":true}]'
      >
        <textarea
          id="phones"
          rows={6}
          className={appointmentControlClassName}
          value={phonesJson}
          onChange={(event) => setPhonesJson(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="source" label="Official source URL (https)" required>
        <input
          id="source"
          required
          className={appointmentControlClassName}
          value={officialSourceUrl}
          onChange={(event) => setOfficialSourceUrl(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="website" label="Official website (optional https)">
        <input
          id="website"
          className={appointmentControlClassName}
          value={officialWebsite}
          onChange={(event) => setOfficialWebsite(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="org" label="Organization" required>
        <input
          id="org"
          required
          className={appointmentControlClassName}
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="org-type" label="Organization type">
        <select
          id="org-type"
          className={appointmentControlClassName}
          value={organizationType}
          onChange={(event) =>
            setOrganizationType(event.target.value as typeof organizationType)
          }
        >
          {CRISIS_ORGANIZATION_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </AppointmentField>
      <AppointmentField id="source-title" label="Source title" required>
        <input
          id="source-title"
          required
          className={appointmentControlClassName}
          value={sourceTitle}
          onChange={(event) => setSourceTitle(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="authority" label="Source authority" required>
        <input
          id="authority"
          required
          className={appointmentControlClassName}
          value={sourceAuthority}
          onChange={(event) => setSourceAuthority(event.target.value)}
        />
      </AppointmentField>
      <div className="grid gap-4 md:grid-cols-2">
        <AppointmentField id="verified-at" label="Verified at (YYYY-MM-DD)" required>
          <input
            id="verified-at"
            required
            className={appointmentControlClassName}
            value={sourceVerifiedAt}
            onChange={(event) => setSourceVerifiedAt(event.target.value)}
          />
        </AppointmentField>
        <AppointmentField id="due-at" label="Next verification due" required>
          <input
            id="due-at"
            required
            className={appointmentControlClassName}
            value={nextVerificationDueAt}
            onChange={(event) => setNextVerificationDueAt(event.target.value)}
          />
        </AppointmentField>
      </div>
      <AppointmentField id="notes" label="Verification notes">
        <textarea
          id="notes"
          rows={3}
          className={appointmentControlClassName}
          value={verificationNotes}
          onChange={(event) => setVerificationNotes(event.target.value)}
        />
      </AppointmentField>
      <div className="grid gap-4 md:grid-cols-3">
        <AppointmentField id="status" label="Verification status">
          <select
            id="status"
            className={appointmentControlClassName}
            value={verificationStatus}
            onChange={(event) =>
              setVerificationStatus(
                event.target.value as typeof verificationStatus,
              )
            }
          >
            {CRISIS_VERIFICATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </AppointmentField>
        <AppointmentField id="level" label="Emergency level">
          <select
            id="level"
            className={appointmentControlClassName}
            value={emergencyLevel}
            onChange={(event) =>
              setEmergencyLevel(event.target.value as typeof emergencyLevel)
            }
          >
            {CRISIS_EMERGENCY_LEVELS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </AppointmentField>
        <AppointmentField id="order" label="Display order">
          <input
            id="order"
            className={appointmentControlClassName}
            value={displayOrder}
            onChange={(event) => setDisplayOrder(event.target.value)}
          />
        </AppointmentField>
      </div>
      <AppointmentField id="availability" label="Availability">
        <input
          id="availability"
          className={appointmentControlClassName}
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        />
      </AppointmentField>
      <AppointmentField id="coverage" label="Coverage">
        <input
          id="coverage"
          className={appointmentControlClassName}
          value={coverage}
          onChange={(event) => setCoverage(event.target.value)}
        />
      </AppointmentField>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Active (eligible for public display when VERIFIED)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
          />
          Featured
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save crisis resource"}
      </button>
    </form>
  );
}
