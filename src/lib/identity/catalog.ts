import { eq } from "drizzle-orm";

import {
  CLINICAL_PERMISSIONS,
  PRACTICE_PERMISSIONS,
  type PermissionName,
  type RoleName,
} from "@/lib/identity/constants";
import { generateUuid } from "@/lib/identity/crypto";
import type { IdentityDb } from "@/lib/identity/db";
import { permissions, rolePermissions, roles } from "@/lib/identity/schema";

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: "Platform and practice configuration. No automatic clinical access.",
  PSYCHOLOGIST: "Practice operations for the psychologist.",
  STAFF: "Reserved operational role. No permissions in Phase 1.",
  PATIENT: "Own-resource access through ownership rules.",
};

const PERMISSION_DESCRIPTIONS: Record<PermissionName, string> = {
  MANAGE_PRACTICE_SETTINGS: "Manage practice configuration.",
  MANAGE_CONTACT_SETTINGS: "Manage contact configuration.",
  MANAGE_LOCATION_SETTINGS: "Manage location configuration.",
  MANAGE_APPOINTMENT_SETTINGS: "Manage appointment configuration.",
  MANAGE_NOTIFICATION_SETTINGS: "Manage notification configuration.",
  MANAGE_PUBLIC_SITE_SETTINGS: "Manage selected public-site configuration.",
  MANAGE_USERS: "Manage user accounts.",
  MANAGE_ROLES: "Manage role assignments.",
  VIEW_AUDIT_LOGS: "View audit history.",
  MANAGE_SYSTEM_SETTINGS: "Manage system configuration.",
  VIEW_CLINICAL_RECORDS: "View clinical records (Option C — not granted).",
  VIEW_PRIVATE_CLINICAL_NOTES: "View private clinical notes (Option C — not granted).",
  MANAGE_CLINICAL_NOTES: "Manage clinical notes (Option C — not granted).",
  VIEW_CLINICAL_DOCUMENTS: "View clinical documents (Option C — not granted).",
  MANAGE_CLINICAL_DOCUMENTS: "Manage clinical documents (Option C — not granted).",
};

export async function seedIdentityCatalog(
  db: IdentityDb,
  now: Date,
): Promise<void> {
  const roleRows = await db.select({ name: roles.name }).from(roles);
  if (roleRows.length === 0) {
    await db.insert(roles).values(
      (Object.keys(ROLE_DESCRIPTIONS) as RoleName[]).map((name) => ({
        id: generateUuid(),
        name,
        description: ROLE_DESCRIPTIONS[name],
        createdAt: now,
      })),
    );
  }

  const permissionRows = await db
    .select({ name: permissions.name })
    .from(permissions);
  if (permissionRows.length === 0) {
    await db.insert(permissions).values([
      ...PRACTICE_PERMISSIONS.map((name) => ({
        id: generateUuid(),
        name,
        description: PERMISSION_DESCRIPTIONS[name],
        isClinical: false,
        createdAt: now,
      })),
      ...CLINICAL_PERMISSIONS.map((name) => ({
        id: generateUuid(),
        name,
        description: PERMISSION_DESCRIPTIONS[name],
        isClinical: true,
        createdAt: now,
      })),
    ]);
  }

  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);
  const existingGrants = await db.select().from(rolePermissions);
  if (existingGrants.length > 0) {
    return;
  }

  const roleByName = new Map(allRoles.map((row) => [row.name, row]));
  const permissionByName = new Map(
    allPermissions.map((row) => [row.name, row]),
  );

  const grants: { roleId: string; permissionId: string }[] = [];
  const superAdmin = roleByName.get("SUPER_ADMIN");
  const psychologist = roleByName.get("PSYCHOLOGIST");
  if (!superAdmin || !psychologist) {
    throw new Error("ROLE_CATALOG_MISSING");
  }

  const psychologistPracticePermissions = new Set([
    "MANAGE_PRACTICE_SETTINGS",
    "MANAGE_CONTACT_SETTINGS",
    "MANAGE_LOCATION_SETTINGS",
    "MANAGE_APPOINTMENT_SETTINGS",
    "MANAGE_NOTIFICATION_SETTINGS",
    "VIEW_AUDIT_LOGS",
  ]);

  for (const name of PRACTICE_PERMISSIONS) {
    const permission = permissionByName.get(name);
    if (!permission) {
      continue;
    }
    grants.push({ roleId: superAdmin.id, permissionId: permission.id });
    if (psychologistPracticePermissions.has(name)) {
      grants.push({ roleId: psychologist.id, permissionId: permission.id });
    }
  }

  if (grants.length > 0) {
    await db.insert(rolePermissions).values(grants);
  }
}

export async function getRoleIdByName(
  db: IdentityDb,
  name: RoleName,
): Promise<string | null> {
  const [row] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, name))
    .limit(1);
  return row?.id ?? null;
}
