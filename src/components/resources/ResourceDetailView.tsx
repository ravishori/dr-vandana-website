import Link from "next/link";

import { ResourceDisclaimer } from "@/components/resources/ResourceDisclaimer";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  evidenceLevelLabels,
  resourceAudienceLabels,
  resourceTopicLabels,
  resourceTypeLabels,
} from "@/data/resources/seed";
import { isSafeExternalUrl } from "@/lib/resources/schema";
import type { WellnessResource } from "@/types/resources";

function ExternalAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  if (!isSafeExternalUrl(href)) {
    return null;
  }
  return (
    <ButtonLink href={href} external variant="secondary">
      {label}
    </ButtonLink>
  );
}

export function ResourceDetailView({ resource }: { resource: WellnessResource }) {
  const purchaseLinks = resource.purchaseUrls.filter((link) =>
    isSafeExternalUrl(link.url),
  );

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-surface-soft text-brand rounded-full px-2.5 py-1">
            {resourceTypeLabels[resource.resourceType]}
          </span>
          <span className="border-brand-muted/30 rounded-full border px-2.5 py-1">
            {evidenceLevelLabels[resource.evidenceLevel]}
          </span>
          {resource.isPeerReviewed ? (
            <span className="border-brand-muted/30 rounded-full border px-2.5 py-1">
              Peer-reviewed indicator
            </span>
          ) : null}
        </div>
        <h1>{resource.title}</h1>
        <p className="text-brand-muted font-serif text-xl">
          {resource.author ?? resource.authors.join(", ")}
        </p>
        <p className="text-base leading-relaxed md:text-lg">
          {resource.shortDescription}
        </p>
      </div>

      <ResourceDisclaimer />

      <section className="space-y-3">
        <h2>Overview</h2>
        <p className="leading-relaxed whitespace-pre-wrap">{resource.description}</p>
      </section>

      {resource.whyUseful ? (
        <section className="space-y-3">
          <h2>Why this resource may be useful</h2>
          <p className="leading-relaxed">{resource.whyUseful}</p>
        </section>
      ) : null}

      <section className="grid gap-4 text-sm md:grid-cols-2">
        <div>
          <h2 className="text-lg">Suitable for</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {resource.audiences.map((audience) => (
              <li key={audience}>{resourceAudienceLabels[audience]}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg">Topics</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {resource.topics.map((topic) => (
              <li key={topic}>{resourceTopicLabels[topic]}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg">Format</h2>
          <p className="mt-2">
            {resource.formats.map((format) => format.replaceAll("_", " ")).join(", ") ||
              "Not specified"}
          </p>
        </div>
        <div>
          <h2 className="text-lg">Classification</h2>
          <p className="mt-2">
            {evidenceLevelLabels[resource.evidenceLevel]} · {resource.difficultyLevel}
          </p>
        </div>
      </section>

      {(resource.publisher ||
        resource.publicationDate ||
        resource.isbn ||
        resource.journalName ||
        resource.doi ||
        resource.citation) && (
        <section className="space-y-2 text-sm">
          <h2>Publication information</h2>
          {resource.publisher ? <p>Publisher: {resource.publisher}</p> : null}
          {resource.publicationDate ? (
            <p>Publication date: {resource.publicationDate}</p>
          ) : null}
          {resource.isbn ? <p>ISBN: {resource.isbn}</p> : null}
          {resource.journalName ? <p>Journal: {resource.journalName}</p> : null}
          {resource.doi ? <p>DOI: {resource.doi}</p> : null}
          {resource.citation ? <p>Citation: {resource.citation}</p> : null}
        </section>
      )}

      {resource.researchSummary ? (
        <section className="space-y-4">
          <h2>Explained simply</h2>
          <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
            <li>
              <strong>What researchers studied / asked: </strong>
              {resource.researchSummary.researchQuestion}
            </li>
            <li>
              <strong>What they did: </strong>
              {resource.researchSummary.whatResearchersDid}
            </li>
            <li>
              <strong>What they found: </strong>
              {resource.researchSummary.mainFindings}
            </li>
            <li>
              <strong>Limitations: </strong>
              {resource.researchSummary.limitations}
            </li>
            <li>
              <strong>What it may mean: </strong>
              {resource.researchSummary.everydayLanguage}
            </li>
            <li>
              <strong>Practical takeaway: </strong>
              {resource.researchSummary.practicalTakeaway}
            </li>
          </ol>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {resource.readOnlineUrl ? (
          <ExternalAction href={resource.readOnlineUrl} label="Read online" />
        ) : null}
        {resource.externalUrl &&
        resource.externalUrl !== resource.readOnlineUrl ? (
          <ExternalAction
            href={resource.externalUrl}
            label={
              resource.resourceType === "RESEARCH_PAPER" ||
              resource.resourceType === "JOURNAL"
                ? "Read original research / source"
                : "Visit official website"
            }
          />
        ) : null}
        <ButtonLink href="/resources" variant="ghost" className="px-0">
          Back to library
        </ButtonLink>
      </div>

      {purchaseLinks.length > 0 ? (
        <section className="space-y-3">
          <h2>Purchase options</h2>
          <p className="text-text-muted text-sm">
            Purchase links are shown only when a verified retailer URL has been
            added by the practice. This website is not a bookstore.
          </p>
          <ul className="flex flex-col gap-2">
            {purchaseLinks.map((link) => (
              <li key={`${link.retailerName}-${link.url}`}>
                <ExternalAction
                  href={link.url}
                  label={`Buy via ${link.retailerName}`}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : resource.resourceType === "BOOK" ? (
        <p className="text-text-muted text-sm">
          No verified purchase links are listed for this book yet. Please use a
          reputable bookseller, publisher or library if you wish to obtain it.
        </p>
      ) : null}

      {resource.relatedArticleHrefs.length > 0 ? (
        <section className="space-y-3">
          <h2>Related pages on this website</h2>
          <ul className="list-disc space-y-2 pl-5">
            {resource.relatedArticleHrefs.map((href) => (
              <li key={href}>
                <Link href={href}>{href}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="border-brand-muted/30 bg-surface-soft rounded-[var(--radius-lg)] border p-5">
        <p className="text-sm leading-relaxed">
          Would you like to discuss your concerns with a psychologist?
        </p>
        <div className="mt-4">
          <ButtonLink href="/contact">Contact Dr. Vandana</ButtonLink>
        </div>
      </div>
    </div>
  );
}
