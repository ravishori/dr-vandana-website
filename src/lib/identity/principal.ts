import { and, eq } from "drizzle-orm";

import {
  type PermissionName,
  type RoleName,
} from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import {
  patientProfiles,
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from "@/lib/identity/schema";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import type { LoadedSession } from "@/lib/identity/sessions";

export async function loadPrincipal(
  ctx: IdentityContext,
  session: LoadedSession,
): Promise<AuthorizationPrincipal> {
  const roleRows = await ctx.db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, session.userId));

  const permissionRows = await ctx.db
    .select({ name: permissions.name })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, session.userId));

  const [profile] = await ctx.db
    .select({ id: patientProfiles.id })
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, session.userId))
    .limit(1);

  const uniquePermissions = [
    ...new Set(permissionRows.map((row) => row.name as PermissionName)),
  ];

  return {
    userId: session.userId,
    roles: roleRows.map((row) => row.name as RoleName),
    permissions: uniquePermissions,
    patientProfileId: profile?.id ?? null,
    mfaCompleted: session.mfaCompleted,
  };
}

export async function userHasRole(
  ctx: IdentityContext,
  userId: string,
  role: RoleName,
): Promise<boolean> {
  const rows = await ctx.db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.name, role)))
    .limit(1);
  return rows.length > 0;
}
