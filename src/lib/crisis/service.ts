import type { PsychologistSession } from "@/types/question-portal";
import type {
  CrisisDashboardStats,
  CrisisListFilters,
  CrisisResource,
  CrisisResourceVerification,
} from "@/types/crisis";
import {
  criticalCrisisFallback,
} from "@/data/crisis/seed";
import {
  crisisUpsertSchema,
  type CrisisUpsertParsed,
  verificationDueState,
} from "@/lib/crisis/schema";
import { isPublicCrisisResource } from "@/lib/crisis/repository";
import { getCrisisRepository } from "@/lib/crisis/store";

/**
 * Authorization gate for crisis resource mutations.
 * Until multi-role auth exists, only authenticated PSYCHOLOGIST sessions may manage crisis records.
 * Documented as the temporary equivalent of MANAGE_CRISIS_RESOURCES.
 */
function assertCrisisManager(
  session: PsychologistSession | null,
): PsychologistSession {
  if (!session || session.role !== "PSYCHOLOGIST") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function listPublicCrisisResources(): Promise<{
  resources: CrisisResource[];
  usedFallback: boolean;
}> {
  try {
    const repository = await getCrisisRepository();
    const resources = await repository.list({ publicOnly: true });
    if (resources.length === 0) {
      return {
        resources: [...criticalCrisisFallback],
        usedFallback: true,
      };
    }
    return { resources, usedFallback: false };
  } catch {
    return {
      resources: [...criticalCrisisFallback],
      usedFallback: true,
    };
  }
}

export async function listAdminCrisisResources(
  session: PsychologistSession | null,
  filters: CrisisListFilters = {},
): Promise<CrisisResource[]> {
  assertCrisisManager(session);
  const repository = await getCrisisRepository();
  return repository.list(filters);
}

export async function getAdminCrisisResource(
  session: PsychologistSession | null,
  slug: string,
): Promise<CrisisResource | null> {
  assertCrisisManager(session);
  const repository = await getCrisisRepository();
  return repository.getBySlug(slug);
}

export async function getCrisisStats(
  session: PsychologistSession | null,
): Promise<CrisisDashboardStats> {
  assertCrisisManager(session);
  const repository = await getCrisisRepository();
  return repository.stats();
}

export async function listCrisisVerifications(
  session: PsychologistSession | null,
  resourceId: string,
): Promise<CrisisResourceVerification[]> {
  assertCrisisManager(session);
  const repository = await getCrisisRepository();
  return repository.listVerifications(resourceId);
}

export async function upsertCrisisResource(
  session: PsychologistSession | null,
  input: CrisisUpsertParsed,
  verificationNote?: string,
): Promise<CrisisResource> {
  const actor = assertCrisisManager(session);
  const parsed = crisisUpsertSchema.parse(input);
  const repository = await getCrisisRepository();

  const existing = parsed.id
    ? await repository.getById(parsed.id)
    : await repository.getBySlug(parsed.slug);

  if (!existing) {
    const slugOwner = await repository.getBySlug(parsed.slug);
    if (slugOwner) {
      throw new Error("DUPLICATE_SLUG");
    }
  } else if (parsed.id && existing.id !== parsed.id) {
    throw new Error("NOT_FOUND");
  }

  // Prevent publishing without a source URL (schema already requires https).
  if (
    parsed.verificationStatus === "VERIFIED" &&
    parsed.isActive &&
    !parsed.officialSourceUrl
  ) {
    throw new Error("MISSING_SOURCE");
  }

  const now = new Date().toISOString();
  const resource: CrisisResource = {
    id: existing?.id ?? parsed.id ?? crypto.randomUUID(),
    slug: parsed.slug,
    name: parsed.name,
    shortName: parsed.shortName,
    category: parsed.category,
    description: parsed.description,
    purposeNote: parsed.purposeNote,
    phoneNumbers: parsed.phoneNumbers,
    emergencyLevel: parsed.emergencyLevel,
    availability: parsed.availability,
    languages: parsed.languages,
    coverage: parsed.coverage,
    country: parsed.country,
    state: parsed.state,
    district: parsed.district,
    organization: parsed.organization,
    organizationType: parsed.organizationType,
    officialWebsite: parsed.officialWebsite,
    officialSourceUrl: parsed.officialSourceUrl,
    sourceTitle: parsed.sourceTitle,
    sourceAuthority: parsed.sourceAuthority,
    sourceVerifiedAt: parsed.sourceVerifiedAt,
    nextVerificationDueAt: parsed.nextVerificationDueAt,
    verificationStatus: parsed.verificationStatus,
    verificationNotes: parsed.verificationNotes,
    displayOrder: parsed.displayOrder,
    isFeatured: parsed.isFeatured,
    isActive: parsed.isActive,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? actor.email,
    updatedBy: actor.email,
  };

  const saved = existing
    ? await repository.update(resource)
    : await repository.create(resource);

  if (
    !existing ||
    existing.verificationStatus !== saved.verificationStatus ||
    existing.officialSourceUrl !== saved.officialSourceUrl ||
    existing.phoneNumbers.map((p) => p.tel).join(",") !==
      saved.phoneNumbers.map((p) => p.tel).join(",")
  ) {
    await repository.addVerification({
      id: crypto.randomUUID(),
      resourceId: saved.id,
      previousStatus: existing?.verificationStatus ?? null,
      newStatus: saved.verificationStatus,
      verifiedAt: saved.sourceVerifiedAt,
      verifiedBy: actor.email,
      sourceUrl: saved.officialSourceUrl,
      notes:
        verificationNote?.trim() ||
        saved.verificationNotes ||
        "Resource updated by authorized psychologist.",
      createdAt: now,
    });
  }

  return saved;
}

export async function markCrisisNeedsReviewIfOverdue(
  session: PsychologistSession | null,
): Promise<number> {
  assertCrisisManager(session);
  const repository = await getCrisisRepository();
  const resources = await repository.list({});
  let updated = 0;
  for (const resource of resources) {
    if (resource.verificationStatus !== "VERIFIED") {
      continue;
    }
    const due = verificationDueState(resource.nextVerificationDueAt);
    if (due !== "overdue") {
      continue;
    }
    await upsertCrisisResource(session, {
      ...resource,
      verificationStatus: "NEEDS_REVIEW",
      verificationNotes: `${resource.verificationNotes}\nAuto-flagged NEEDS_REVIEW after verification due date passed.`.trim(),
    }, "Auto-flagged NEEDS_REVIEW after verification due date passed.");
    updated += 1;
  }
  return updated;
}

export function assertResourceIsPublicSafe(resource: CrisisResource): boolean {
  return isPublicCrisisResource(resource);
}
