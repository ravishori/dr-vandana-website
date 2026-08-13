"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ResourceCard } from "@/components/resources/ResourceCard";
import {
  evidenceLevelLabels,
  resourceAudienceLabels,
  resourceTopicLabels,
  resourceTypeLabels,
} from "@/data/resources/seed";
import { appointmentControlClassName } from "@/components/appointment/AppointmentField";
import {
  DIFFICULTY_LEVELS,
  EVIDENCE_LEVELS,
  RESOURCE_AUDIENCES,
  RESOURCE_FORMATS,
  RESOURCE_TOPICS,
  RESOURCE_TYPES,
  type WellnessResource,
} from "@/types/resources";

type ResourceLibraryClientProps = {
  initialItems: WellnessResource[];
  total: number;
  page: number;
  pageSize: number;
};

export function ResourceLibraryClient({
  initialItems,
  total,
  page,
  pageSize,
}: ResourceLibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (query === current) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/resources?${params.toString()}`);
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [query, router, searchParams]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filterValues = useMemo(
    () => ({
      type: searchParams.get("type") ?? "",
      topic: searchParams.get("topic") ?? "",
      audience: searchParams.get("audience") ?? "",
      format: searchParams.get("format") ?? "",
      level: searchParams.get("level") ?? "",
      evidence: searchParams.get("evidence") ?? "",
    }),
    [searchParams],
  );

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`/resources?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <label htmlFor="resource-search" className="text-sm font-medium">
          Search books, topics, research and resources
        </label>
        <input
          id="resource-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search books, topics, research and resources..."
          className={appointmentControlClassName}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <select
          aria-label="Resource type"
          className={appointmentControlClassName}
          value={filterValues.type}
          onChange={(event) => updateFilter("type", event.target.value)}
        >
          <option value="">All types</option>
          {RESOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {resourceTypeLabels[type]}
            </option>
          ))}
        </select>
        <select
          aria-label="Topic"
          className={appointmentControlClassName}
          value={filterValues.topic}
          onChange={(event) => updateFilter("topic", event.target.value)}
        >
          <option value="">All topics</option>
          {RESOURCE_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {resourceTopicLabels[topic]}
            </option>
          ))}
        </select>
        <select
          aria-label="Audience"
          className={appointmentControlClassName}
          value={filterValues.audience}
          onChange={(event) => updateFilter("audience", event.target.value)}
        >
          <option value="">All audiences</option>
          {RESOURCE_AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>
              {resourceAudienceLabels[audience]}
            </option>
          ))}
        </select>
        <select
          aria-label="Format"
          className={appointmentControlClassName}
          value={filterValues.format}
          onChange={(event) => updateFilter("format", event.target.value)}
        >
          <option value="">All formats</option>
          {RESOURCE_FORMATS.map((format) => (
            <option key={format} value={format}>
              {format.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Level"
          className={appointmentControlClassName}
          value={filterValues.level}
          onChange={(event) => updateFilter("level", event.target.value)}
        >
          <option value="">All levels</option>
          {DIFFICULTY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <select
          aria-label="Evidence level"
          className={appointmentControlClassName}
          value={filterValues.evidence}
          onChange={(event) => updateFilter("evidence", event.target.value)}
        >
          <option value="">All evidence labels</option>
          {EVIDENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {evidenceLevelLabels[level]}
            </option>
          ))}
        </select>
      </div>

      <p className="text-text-muted text-sm" aria-live="polite">
        {pending
          ? "Updating results…"
          : `${total} resource${total === 1 ? "" : "s"} found`}
      </p>

      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {initialItems.map((resource) => (
          <li key={resource.id}>
            <ResourceCard resource={resource} />
          </li>
        ))}
      </ul>

      {initialItems.length === 0 ? (
        <p className="text-text-muted text-sm">
          No published resources match these filters yet.
        </p>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 ? (
            <button
              type="button"
              className="text-brand underline-offset-4 hover:underline"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(page - 1));
                router.push(`/resources?${params.toString()}`);
              }}
            >
              Previous
            </button>
          ) : null}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <button
              type="button"
              className="text-brand underline-offset-4 hover:underline"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(page + 1));
                router.push(`/resources?${params.toString()}`);
              }}
            >
              Next
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
