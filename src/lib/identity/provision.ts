import { getRoleIdByName } from "@/lib/identity/catalog";
import {
  CLINICAL_PERMISSIONS,
  type PermissionName,
  type RoleName,
} from "@/lib/identity/constants";
import { isPrivilegedProvisionAllowed } from "@/lib/identity/config";
import type { IdentityContext } from "@/lib/identity/context";
import { generatePublicId, generateUuid } from "@/lib/identity/crypto";
import { isValidEmail, normalizeEmail, normalizeMobile } from "@/lib/identity/normalize";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import {
  permissions,
  psychologistProfiles,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/lib/identity/schema";
import { authorizationService, type AuthorizationPrincipal } from "@/lib/identity/authorization";
import { appendAuditLog } from "@/lib/identity/audit";
import { hashPassword } from "@/lib/question-portal/password";
import { eq } from "drizzle-orm";

export type ProvisionInput = {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN" | "STAFF">;
  email: string;
  password: string;
  displayName: string;
  mobile?: string;
};

export async function provisionPrivilegedUser(
  ctx: IdentityContext,
  input: ProvisionInput,
): Promise<
  | { ok: true; userId: string; publicId: string }
  | { ok: false; message: string }
> {
  if (!isPrivilegedProvisionAllowed(ctx.config)) {
    return {
      ok: false,
      message: "Privileged accounts cannot be provisioned in this environment.",
    };
  }
  if (!isValidEmail(input.email)) {
    return { ok: false, message: "A valid email is required." };
  }
  const policy = evaluatePasswordPolicy(input.password, input.email);
  if (!policy.ok) {
    return { ok: false, message: policy.message };
  }
  const emailNormalized = normalizeEmail(input.email);
  const [existing] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);
  if (existing) {
    return { ok: false, message: "That account could not be provisioned." };
  }
  const roleId = await getRoleIdByName(ctx.db, input.role);
  if (!roleId) {
    return { ok: false, message: "Role catalog is not ready." };
  }
  const now = ctx.now();
  const userId = generateUuid();
  const prefix =
    input.role === "SUPER_ADMIN"
      ? "ADM"
      : input.role === "PSYCHOLOGIST"
        ? "PSY"
        : "STF";
  const publicId = generatePublicId(prefix);
  const mobileNormalized = input.mobile ? normalizeMobile(input.mobile) : null;
  const passwordHash = await hashPassword(input.password);

  await ctx.db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      publicId,
      email: input.email.trim(),
      emailNormalized,
      passwordHash,
      mobileNumber: mobileNormalized,
      mobileNormalized,
      mobileVerifiedAt: mobileNormalized ? now : null,
      emailVerifiedAt: now,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    await tx.insert(userRoles).values({
      userId,
      roleId,
      assignedAt: now,
      assignedBy: null,
    });
    if (input.role === "PSYCHOLOGIST") {
      await tx.insert(psychologistProfiles).values({
        id: generateUuid(),
        userId,
        displayName: input.displayName.trim(),
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  await appendAuditLog(ctx, {
    actorUserId: null,
    action: "USER_PROVISIONED",
    targetType: "user",
    targetId: userId,
    result: "SUCCESS",
    metadata: { role: input.role },
  });
  return { ok: true, userId, publicId };
}

export async function assignRole(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: { userId: string; role: RoleName },
): Promise<{ ok: true } | { ok: false; reason: "unauthenticated" | "forbidden" }> {
  const decision = authorizationService.canAccess(principal, {
    permission: "MANAGE_ROLES",
  });
  if (!decision.allowed) {
    return {
      ok: false,
      reason: decision.reason === "unauthenticated" ? "unauthenticated" : "forbidden",
    };
  }
  if (!principal) {
    return { ok: false, reason: "unauthenticated" };
  }
  if (principal.userId === input.userId) {
    return { ok: false, reason: "forbidden" };
  }
  const roleId = await getRoleIdByName(ctx.db, input.role);
  if (!roleId) {
    return { ok: false, reason: "forbidden" };
  }
  await ctx.db
    .insert(userRoles)
    .values({
      userId: input.userId,
      roleId,
      assignedAt: ctx.now(),
      assignedBy: principal.userId,
    })
    .onConflictDoNothing();
  await appendAuditLog(ctx, {
    actorUserId: principal.userId,
    action: "ROLE_CHANGED",
    targetType: "user",
    targetId: input.userId,
    result: "SUCCESS",
    metadata: { role: input.role },
  });
  return { ok: true };
}

export async function grantPermissionToRole(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: { role: RoleName; permission: PermissionName },
): Promise<{ ok: true } | { ok: false; reason: "unauthenticated" | "forbidden" }> {
  const decision = authorizationService.canAccess(principal, {
    permission: "MANAGE_ROLES",
  });
  if (!decision.allowed) {
    return {
      ok: false,
      reason: decision.reason === "unauthenticated" ? "unauthenticated" : "forbidden",
    };
  }
  if (
    CLINICAL_PERMISSIONS.includes(
      input.permission as (typeof CLINICAL_PERMISSIONS)[number],
    )
  ) {
    return { ok: false, reason: "forbidden" };
  }
  const [role] = await ctx.db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, input.role))
    .limit(1);
  const [permission] = await ctx.db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.name, input.permission))
    .limit(1);
  if (!role || !permission) {
    return { ok: false, reason: "forbidden" };
  }
  await ctx.db
    .insert(rolePermissions)
    .values({ roleId: role.id, permissionId: permission.id })
    .onConflictDoNothing();
  return { ok: true };
}
