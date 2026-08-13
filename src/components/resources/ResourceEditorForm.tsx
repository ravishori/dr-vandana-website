"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  archiveResourceAction,
  saveResourceAction,
} from "@/app/psychologist/resources/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import {
  resourceAudienceLabels,
  resourceTopicLabels,
  resourceTypeLabels,
} from "@/data/resources/seed";
import { slugifyTitle } from "@/lib/resources/schema";
import {
  DIFFICULTY_LEVELS,
  EVIDENCE_LEVELS,
  RESOURCE_AUDIENCES,
  RESOURCE_FORMATS,
  RESOURCE_STATUSES,
  RESOURCE_TOPICS,
  RESOURCE_TYPES,
  URL_CHECK_STATUSES,
  type WellnessResource,
} from "@/types/resources";

type ResourceEditorFormProps = {
  initial?: WellnessResource | null;
};

export function ResourceEditorForm({ initial }: ResourceEditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [resourceType, setResourceType] = useState(
    initial?.resourceType ?? "WEBSITE",
  );
  const [category, setCategory] = useState(initial?.category ?? "Mental Wellness");
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl ?? "");
  const [readOnlineUrl, setReadOnlineUrl] = useState(
    initial?.readOnlineUrl ?? "",
  );
  const [whyUseful, setWhyUseful] = useState(initial?.whyUseful ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [evidenceLevel, setEvidenceLevel] = useState(
    initial?.evidenceLevel ?? "EDUCATIONAL",
  );
  const [difficultyLevel, setDifficultyLevel] = useState(
    initial?.difficultyLevel ?? "GENERAL",
  );
  const [topics, setTopics] = useState<string[]>(initial?.topics ?? []);
  const [audiences, setAudiences] = useState<string[]>(
    initial?.audiences ?? ["general-public"],
  );
  const [formats, setFormats] = useState<string[]>(
    initial?.formats ?? ["ONLINE"],
  );
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isVerified, setIsVerified] = useState(initial?.isVerified ?? false);
  const [isPeerReviewed, setIsPeerReviewed] = useState(
    initial?.isPeerReviewed ?? false,
  );
  const [urlCheckStatus, setUrlCheckStatus] = useState(
    initial?.urlCheckStatus ?? "UNVERIFIED",
  );
  const [purchaseJson, setPurchaseJson] = useState(
    JSON.stringify(initial?.purchaseUrls ?? [], null, 2),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slugPreview = useMemo(
    () => slug || slugifyTitle(title),
    [slug, title],
  );

  function toggleValue(
    values: string[],
    value: string,
    setter: (next: string[]) => void,
  ) {
    setter(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          let purchaseUrls = [];
          try {
            purchaseUrls = JSON.parse(purchaseJson) as unknown[];
          } catch {
            setMessage("Purchase links JSON is invalid.");
            return;
          }
          const result = await saveResourceAction({
            id: initial?.id,
            title,
            slug: slugPreview,
            resourceType,
            category,
            description,
            shortDescription,
            author: author || null,
            authors: author ? [author] : [],
            externalUrl: externalUrl || null,
            readOnlineUrl: readOnlineUrl || null,
            whyUseful: whyUseful || null,
            status,
            evidenceLevel,
            difficultyLevel,
            topics: topics as WellnessResource["topics"],
            audiences: audiences as WellnessResource["audiences"],
            formats: formats as WellnessResource["formats"],
            isFeatured,
            isVerified,
            isPeerReviewed,
            urlCheckStatus,
            purchaseUrls: purchaseUrls as WellnessResource["purchaseUrls"],
            language: "en",
            relatedArticleHrefs: initial?.relatedArticleHrefs ?? [],
          });
          if (!result.ok) {
            setMessage(result.message);
            return;
          }
          setMessage("Saved.");
          router.push(`/psychologist/resources/${result.slug}`);
          router.refresh();
        });
      }}
    >
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}

      <AppointmentField id="title" label="Title" required>
        <input
          id="title"
          required
          className={appointmentControlClassName}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (!initial && !slug) {
              setSlug(slugifyTitle(event.target.value));
            }
          }}
        />
      </AppointmentField>

      <AppointmentField id="slug" label="Slug" required>
        <input
          id="slug"
          required
          className={appointmentControlClassName}
          value={slugPreview}
          onChange={(event) => setSlug(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField id="type" label="Resource type">
        <select
          id="type"
          className={appointmentControlClassName}
          value={resourceType}
          onChange={(event) =>
            setResourceType(event.target.value as typeof resourceType)
          }
        >
          {RESOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {resourceTypeLabels[type]}
            </option>
          ))}
        </select>
      </AppointmentField>

      <AppointmentField id="category" label="Category">
        <input
          id="category"
          className={appointmentControlClassName}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField id="author" label="Author / source">
        <input
          id="author"
          className={appointmentControlClassName}
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField id="short" label="Short description" required>
        <textarea
          id="short"
          required
          rows={3}
          className={appointmentControlClassName}
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField id="description" label="Description" required>
        <textarea
          id="description"
          required
          rows={6}
          className={appointmentControlClassName}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField id="why" label="Why this may be useful">
        <textarea
          id="why"
          rows={3}
          className={appointmentControlClassName}
          value={whyUseful}
          onChange={(event) => setWhyUseful(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField
        id="external"
        label="External URL (https only)"
        helperText="Leave blank if there is no verified official link."
      >
        <input
          id="external"
          className={appointmentControlClassName}
          value={externalUrl}
          onChange={(event) => setExternalUrl(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField id="read" label="Read online URL (https only)">
        <input
          id="read"
          className={appointmentControlClassName}
          value={readOnlineUrl}
          onChange={(event) => setReadOnlineUrl(event.target.value)}
        />
      </AppointmentField>

      <AppointmentField
        id="purchase"
        label="Purchase links JSON"
        helperText='Optional. Example: [{"retailerName":"Publisher","url":"https://...","format":"EBOOK","lastChecked":"2026-08-13"}]'
      >
        <textarea
          id="purchase"
          rows={5}
          className={appointmentControlClassName}
          value={purchaseJson}
          onChange={(event) => setPurchaseJson(event.target.value)}
        />
      </AppointmentField>

      <div className="grid gap-4 md:grid-cols-3">
        <AppointmentField id="status" label="Status">
          <select
            id="status"
            className={appointmentControlClassName}
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            {RESOURCE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </AppointmentField>
        <AppointmentField id="evidence" label="Evidence label">
          <select
            id="evidence"
            className={appointmentControlClassName}
            value={evidenceLevel}
            onChange={(event) =>
              setEvidenceLevel(event.target.value as typeof evidenceLevel)
            }
          >
            {EVIDENCE_LEVELS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </AppointmentField>
        <AppointmentField id="difficulty" label="Level">
          <select
            id="difficulty"
            className={appointmentControlClassName}
            value={difficultyLevel}
            onChange={(event) =>
              setDifficultyLevel(event.target.value as typeof difficultyLevel)
            }
          >
            {DIFFICULTY_LEVELS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </AppointmentField>
      </div>

      <AppointmentField id="url-status" label="URL check status">
        <select
          id="url-status"
          className={appointmentControlClassName}
          value={urlCheckStatus}
          onChange={(event) =>
            setUrlCheckStatus(event.target.value as typeof urlCheckStatus)
          }
        >
          {URL_CHECK_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </AppointmentField>

      <fieldset>
        <legend className="text-sm font-medium">Topics</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCE_TOPICS.map((topic) => (
            <label key={topic} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={topics.includes(topic)}
                onChange={() => toggleValue(topics, topic, setTopics)}
              />
              {resourceTopicLabels[topic]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Audiences</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCE_AUDIENCES.map((audience) => (
            <label key={audience} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={audiences.includes(audience)}
                onChange={() =>
                  toggleValue(audiences, audience, setAudiences)
                }
              />
              {resourceAudienceLabels[audience]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Formats</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCE_FORMATS.map((format) => (
            <label key={format} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formats.includes(format)}
                onChange={() => toggleValue(formats, format, setFormats)}
              />
              {format.replaceAll("_", " ")}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
          />
          Featured
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isVerified}
            onChange={(event) => setIsVerified(event.target.checked)}
          />
          Verified by practice
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPeerReviewed}
            onChange={(event) => setIsPeerReviewed(event.target.checked)}
          />
          Peer-reviewed indicator
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save resource"}
        </button>
        {initial ? (
          <button
            type="button"
            disabled={pending}
            className="border-brand-muted rounded-[var(--radius-md)] border px-4 py-2 text-sm"
            onClick={() =>
              startTransition(async () => {
                const result = await archiveResourceAction(initial.slug);
                if (!result.ok) {
                  setMessage(result.message);
                  return;
                }
                router.push("/psychologist/resources");
                router.refresh();
              })
            }
          >
            Archive
          </button>
        ) : null}
      </div>
    </form>
  );
}
