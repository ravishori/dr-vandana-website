import {
  CLINICAL_PERMISSIONS,
  MFA_REQUIRED_ROLES,
  type PermissionName,
  type RoleName,
} from "@/lib/identity/constants";

export type ResourceType = "patient_profile" | "user" | "audit_log";

export type AuthorizationPrincipal = {
  userId: string;
  roles: RoleName[];
  permissions: PermissionName[];
  patientProfileId?: string | null;
  mfaCompleted: boolean;
};

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; reason: "unauthenticated" | "forbidden" | "mfa_required" };

export class AuthorizationService {
  isAuthenticated(principal: AuthorizationPrincipal | null): boolean {
    return principal !== null;
  }

  hasRole(
    principal: AuthorizationPrincipal | null,
    role: RoleName,
  ): boolean {
    return Boolean(principal?.roles.includes(role));
  }

  hasPermission(
    principal: AuthorizationPrincipal | null,
    permission: PermissionName,
  ): boolean {
    return Boolean(principal?.permissions.includes(permission));
  }

  ownsResource(
    principal: AuthorizationPrincipal | null,
    resourceType: ResourceType,
    resourceId: string,
  ): boolean {
    if (!principal) {
      return false;
    }
    if (resourceType === "user") {
      return principal.userId === resourceId;
    }
    if (resourceType === "patient_profile") {
      return principal.patientProfileId === resourceId;
    }
    return false;
  }

  requiresMfa(principal: AuthorizationPrincipal): boolean {
    return principal.roles.some((role) => MFA_REQUIRED_ROLES.includes(role));
  }

  canAccess(
    principal: AuthorizationPrincipal | null,
    input: {
      permission?: PermissionName;
      roles?: RoleName[];
      resourceType?: ResourceType;
      resourceId?: string;
      allowUnauthenticated?: boolean;
    },
  ): AuthorizationDecision {
    if (!principal) {
      if (input.allowUnauthenticated) {
        return { allowed: true };
      }
      return { allowed: false, reason: "unauthenticated" };
    }
    if (this.requiresMfa(principal) && !principal.mfaCompleted) {
      return { allowed: false, reason: "mfa_required" };
    }
    if (input.roles && !input.roles.some((role) => this.hasRole(principal, role))) {
      return { allowed: false, reason: "forbidden" };
    }
    if (input.permission && !this.hasPermission(principal, input.permission)) {
      return { allowed: false, reason: "forbidden" };
    }
    if (
      input.resourceType &&
      input.resourceId &&
      !this.ownsResource(principal, input.resourceType, input.resourceId)
    ) {
      return { allowed: false, reason: "forbidden" };
    }
    return { allowed: true };
  }
}

export const authorizationService = new AuthorizationService();

export function hasAnyClinicalPermission(
  principal: AuthorizationPrincipal | null,
): boolean {
  if (!principal) {
    return false;
  }
  return CLINICAL_PERMISSIONS.some((permission) =>
    principal.permissions.includes(permission),
  );
}
