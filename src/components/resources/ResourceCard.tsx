import Link from "next/link";

import {
  evidenceLevelLabels,
  resourceTypeLabels,
} from "@/data/resources/seed";
import { cn } from "@/lib/utils";
import type { WellnessResource } from "@/types/resources";

export function ResourceCard({ resource }: { resource: WellnessResource }) {
  return (
    <article className="border-brand-muted/30 bg-surface flex h-full flex-col rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-brand bg-surface-soft rounded-full px-2.5 py-1 text-xs font-medium">
          {resourceTypeLabels[resource.resourceType]}
        </span>
        <span className="text-text-muted rounded-full border border-brand-muted/30 px-2.5 py-1 text-xs">
          {evidenceLevelLabels[resource.evidenceLevel]}
        </span>
        {resource.isFeatured ? (
          <span className="text-text bg-accent/30 rounded-full px-2.5 py-1 text-xs font-medium">
            Featured
          </span>
        ) : null}
      </div>
      <h2 className="mt-3 text-xl">
        <Link href={`/resources/${resource.slug}`} className="no-underline">
          {resource.title}
        </Link>
      </h2>
      <p className="text-text-muted mt-2 text-sm">
        {resource.author ??
          (resource.authors.length > 0
            ? resource.authors.join(", ")
            : "Curated source")}
      </p>
      <p className="text-text mt-3 flex-1 text-sm leading-relaxed">
        {resource.shortDescription}
      </p>
      <p className="text-text-muted mt-3 text-xs">
        {resource.category}
        {resource.audiences[0] ? ` · ${resource.audiences[0]}` : ""}
      </p>
      <div className="mt-5">
        <Link
          href={`/resources/${resource.slug}`}
          className={cn(
            "text-brand text-sm font-medium underline-offset-4 hover:underline",
          )}
        >
          View details
        </Link>
      </div>
    </article>
  );
}
