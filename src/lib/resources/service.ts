import type { PsychologistSession } from "@/types/question-portal";
import type {
  ResourceDashboardStats,
  ResourceListFilters,
  ResourceListResult,
  WellnessResource,
} from "@/types/resources";
import {
  resourceUpsertSchema,
  type ResourceUpsertInput,
} from "@/lib/resources/schema";
import { getResourceRepository } from "@/lib/resources/store";

function assertPsychologist(
  session: PsychologistSession | null,
): PsychologistSession {
  if (!session || session.role !== "PSYCHOLOGIST") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function listPublishedResources(
  filters: ResourceListFilters = {},
): Promise<ResourceListResult> {
  const repository = await getResourceRepository();
  return repository.list({
    ...filters,
    status: "PUBLISHED",
  });
}

export async function getPublishedResourceBySlug(
  slug: string,
): Promise<WellnessResource | null> {
  const repository = await getResourceRepository();
  const resource = await repository.getBySlug(slug);
  if (!resource || resource.status !== "PUBLISHED") {
    return null;
  }
  return resource;
}

export async function listAdminResources(
  session: PsychologistSession | null,
  filters: ResourceListFilters = {},
): Promise<ResourceListResult> {
  assertPsychologist(session);
  const repository = await getResourceRepository();
  return repository.list(filters);
}

export async function getAdminResourceBySlug(
  session: PsychologistSession | null,
  slug: string,
): Promise<WellnessResource | null> {
  assertPsychologist(session);
  const repository = await getResourceRepository();
  return repository.getBySlug(slug);
}

export async function getResourceStats(
  session: PsychologistSession | null,
): Promise<ResourceDashboardStats> {
  assertPsychologist(session);
  const repository = await getResourceRepository();
  return repository.stats();
}

export async function upsertResource(
  session: PsychologistSession | null,
  input: ResourceUpsertInput,
): Promise<WellnessResource> {
  const actor = assertPsychologist(session);
  const parsed = resourceUpsertSchema.parse(input);
  const repository = await getResourceRepository();
  const existing = parsed.id
    ? await repository.getById(parsed.id)
    : await repository.getBySlug(parsed.slug);

  if (existing && parsed.id && existing.id !== parsed.id) {
    throw new Error("NOT_FOUND");
  }
  if (existing && !parsed.id && existing.slug === parsed.slug) {
    // update by slug when id omitted
  } else if (!existing) {
    const slugOwner = await repository.getBySlug(parsed.slug);
    if (slugOwner && slugOwner.id !== parsed.id) {
      throw new Error("DUPLICATE_SLUG");
    }
  }

  const now = new Date().toISOString();
  const resource: WellnessResource = {
    id: existing?.id ?? parsed.id ?? crypto.randomUUID(),
    title: parsed.title,
    slug: parsed.slug,
    resourceType: parsed.resourceType,
    category: parsed.category,
    subcategory: parsed.subcategory ?? null,
    description: parsed.description,
    shortDescription: parsed.shortDescription,
    author: parsed.author ?? null,
    authors: parsed.authors ?? (parsed.author ? [parsed.author] : []),
    publisher: parsed.publisher ?? null,
    publicationDate: parsed.publicationDate ?? null,
    edition: parsed.edition ?? null,
    isbn: parsed.isbn ?? null,
    language: parsed.language,
    formats: parsed.formats,
    audiences: parsed.audiences,
    difficultyLevel: parsed.difficultyLevel,
    evidenceLevel: parsed.evidenceLevel,
    topics: parsed.topics,
    coverImage: parsed.coverImage ?? null,
    externalUrl: parsed.externalUrl ?? null,
    purchaseUrls: parsed.purchaseUrls,
    readOnlineUrl: parsed.readOnlineUrl ?? null,
    doi: parsed.doi ?? null,
    journalName: parsed.journalName ?? null,
    citation: parsed.citation ?? null,
    isPeerReviewed: parsed.isPeerReviewed,
    isFeatured: parsed.isFeatured,
    isVerified: parsed.isVerified,
    verificationDate: parsed.isVerified
      ? (parsed.verificationDate ?? now.slice(0, 10))
      : null,
    verifiedBy: parsed.isVerified
      ? (parsed.verifiedBy ?? actor.email)
      : null,
    urlCheckStatus: parsed.urlCheckStatus,
    researchSummary: parsed.researchSummary ?? null,
    whyUseful: parsed.whyUseful ?? null,
    status: parsed.status,
    relatedArticleHrefs: parsed.relatedArticleHrefs,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    return repository.update(resource);
  }
  return repository.create(resource);
}

export async function archiveResource(
  session: PsychologistSession | null,
  slug: string,
): Promise<WellnessResource> {
  assertPsychologist(session);
  const repository = await getResourceRepository();
  const existing = await repository.getBySlug(slug);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }
  return repository.update({
    ...existing,
    status: "ARCHIVED",
    updatedAt: new Date().toISOString(),
  });
}

export async function listPublishedSlugs(): Promise<string[]> {
  const repository = await getResourceRepository();
  const listed = await repository.list({
    status: "PUBLISHED",
    page: 1,
    pageSize: 500,
  });
  return listed.items.map((item) => item.slug);
}
