import type {
  CrisisDashboardStats,
  CrisisListFilters,
  CrisisResource,
  CrisisResourceVerification,
} from "@/types/crisis";
import { verificationDueState } from "@/lib/crisis/schema";

export interface CrisisRepository {
  ensureSeeded(
    seed: readonly CrisisResource[],
    verifications: readonly CrisisResourceVerification[],
  ): Promise<void>;
  list(filters?: CrisisListFilters): Promise<CrisisResource[]>;
  getBySlug(slug: string): Promise<CrisisResource | null>;
  getById(id: string): Promise<CrisisResource | null>;
  create(resource: CrisisResource): Promise<CrisisResource>;
  update(resource: CrisisResource): Promise<CrisisResource>;
  listVerifications(resourceId: string): Promise<CrisisResourceVerification[]>;
  addVerification(
    entry: CrisisResourceVerification,
  ): Promise<CrisisResourceVerification>;
  stats(): Promise<CrisisDashboardStats>;
}

export function isPublicCrisisResource(resource: CrisisResource): boolean {
  return (
    resource.isActive &&
    resource.verificationStatus === "VERIFIED" &&
    Boolean(resource.officialSourceUrl) &&
    resource.phoneNumbers.length > 0
  );
}

export function matchesCrisisFilters(
  resource: CrisisResource,
  filters: CrisisListFilters = {},
): boolean {
  if (filters.publicOnly && !isPublicCrisisResource(resource)) {
    return false;
  }
  if (filters.activeOnly && !resource.isActive) {
    return false;
  }
  if (
    filters.verificationStatus &&
    resource.verificationStatus !== filters.verificationStatus
  ) {
    return false;
  }
  if (filters.category && resource.category !== filters.category) {
    return false;
  }
  if (filters.overdueOnly) {
    const due = verificationDueState(resource.nextVerificationDueAt);
    if (due !== "overdue" && due !== "due_today") {
      return false;
    }
  }
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    const haystack = [
      resource.name,
      resource.shortName,
      resource.description,
      resource.organization,
      resource.coverage,
      resource.phoneNumbers.map((phone) => phone.display).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) {
      return false;
    }
  }
  return true;
}

export function sortCrisisResources(
  resources: CrisisResource[],
): CrisisResource[] {
  return [...resources].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

export function computeCrisisStats(
  resources: readonly CrisisResource[],
): CrisisDashboardStats {
  return {
    verified: resources.filter(
      (item) => item.verificationStatus === "VERIFIED" && item.isActive,
    ).length,
    needsReview: resources.filter(
      (item) => item.verificationStatus === "NEEDS_REVIEW",
    ).length,
    overdue: resources.filter((item) => {
      const due = verificationDueState(item.nextVerificationDueAt);
      return (
        item.verificationStatus !== "ARCHIVED" &&
        (due === "overdue" || due === "due_today")
      );
    }).length,
    inactive: resources.filter(
      (item) => !item.isActive && item.verificationStatus !== "ARCHIVED",
    ).length,
    archived: resources.filter(
      (item) => item.verificationStatus === "ARCHIVED",
    ).length,
  };
}
