import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "./permission-catalog";
import { ensureRbac } from "./ensure-rbac";
import { effectiveAllowed } from "./effective-permission";

export { effectiveAllowed };

export type EffectiveAccess = {
  userId: string;
  roleId: string;
  roleSlug: string;
  roleName: string;
  keys: Set<PermissionKey>;
  roleAllowed: Set<PermissionKey>;
  overrides: Map<PermissionKey, "allow" | "deny">;
};

export const loadEffectiveAccess = cache(async (userId: string): Promise<EffectiveAccess | null> => {
  await ensureRbac();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: true } },
      permissionOverrides: true,
    },
  });
  if (!user || !user.isActive || !user.roleId || !user.role || !user.role.isActive) return null;

  const roleAllowed = new Set<PermissionKey>();
  for (const row of user.role.permissions) {
    if (row.allowed) roleAllowed.add(row.permissionKey as PermissionKey);
  }

  const overrides = new Map<PermissionKey, "allow" | "deny">();
  for (const row of user.permissionOverrides) {
    if (row.effect === "allow" || row.effect === "deny") {
      overrides.set(row.permissionKey as PermissionKey, row.effect);
    }
  }

  const keys = new Set<PermissionKey>();
  for (const key of ALL_PERMISSION_KEYS) {
    if (effectiveAllowed(roleAllowed.has(key), overrides.get(key))) keys.add(key);
  }

  return {
    userId: user.id,
    roleId: user.roleId,
    roleSlug: user.role.slug,
    roleName: user.role.name,
    keys,
    roleAllowed,
    overrides,
  };
});

export async function can(userId: string, permission: PermissionKey): Promise<boolean> {
  const access = await loadEffectiveAccess(userId);
  return Boolean(access?.keys.has(permission));
}

export async function currentAccess() {
  const user = await requireUser();
  if (!user) return null;
  return loadEffectiveAccess(user.id);
}

export async function requirePage(permission: PermissionKey) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const access = await loadEffectiveAccess(user.id);
  if (!access?.keys.has(permission)) redirect("/forbidden");
  return { user, access };
}

export async function actor(permission: PermissionKey) {
  const user = await requireUser();
  if (!user) return { error: "Not signed in." } as const;
  const access = await loadEffectiveAccess(user.id);
  if (!access?.keys.has(permission)) {
    return { error: "You do not have permission to do this." } as const;
  }
  return { user, access };
}

export function isAllowed(access: EffectiveAccess | null | undefined, permission: PermissionKey) {
  return Boolean(access?.keys.has(permission));
}

export async function countActiveAdministrators(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      isActive: true,
      role: { slug: "administrator" },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}
