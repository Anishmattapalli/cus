"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { actor, can, countActiveAdministrators } from "@/lib/access";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/permission-catalog";
import { resetRbacCache } from "@/lib/ensure-rbac";

async function audit(opts: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  affectedUserId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: opts.actorId,
      affectedUserId: opts.affectedUserId ?? null,
      entityType: opts.entityType,
      entityId: opts.entityId,
      action: opts.action,
      beforeJson: opts.before ? JSON.stringify(opts.before) : null,
      afterJson: opts.after ? JSON.stringify(opts.after) : null,
    },
  });
}

export async function createAccessUser(formData: FormData) {
  const auth = await actor("users.create");
  if ("error" in auth) return auth;
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const roleId = String(formData.get("roleId") || "");
  if (!email || !name || !password || !roleId) return { error: "Name, email, password, and role are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "A user with this email already exists." };
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || !role.isActive) return { error: "Select an active role." };
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      mobile: String(formData.get("mobile") || "").trim() || null,
      designation: String(formData.get("designation") || "").trim() || null,
      roleId,
      isActive: true,
      createdById: auth.user.id,
      updatedById: auth.user.id,
    },
  });
  try {
    await saveOverrides(user.id, formData, auth.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save permission overrides." };
  }
  await audit({
    actorId: auth.user.id,
    action: "user_created",
    entityType: "user",
    entityId: user.id,
    affectedUserId: user.id,
    after: { email, name, roleId },
  });
  revalidatePath("/settings/users");
  return { id: user.id };
}

export async function updateAccessUser(formData: FormData) {
  const auth = await actor("users.edit");
  if ("error" in auth) return auth;
  const userId = String(formData.get("userId") || "");
  const target = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!target) return { error: "User not found." };
  const roleId = String(formData.get("roleId") || target.roleId || "");
  const isActive = String(formData.get("isActive") || "true") === "true";
  const roleChanged = roleId !== target.roleId;

  if (!isActive && target.isActive) {
    const deact = await actor("users.deactivate");
    if ("error" in deact) return deact;
    if (target.role?.slug === "administrator") {
      const others = await countActiveAdministrators(target.id);
      if (others === 0) return { error: "Cannot deactivate the last active administrator." };
    }
  }
  if (roleChanged && target.role?.slug === "administrator") {
    const others = await countActiveAdministrators(target.id);
    if (others === 0) return { error: "Cannot remove the last active administrator role." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: String(formData.get("name") || "").trim() || target.name,
      mobile: String(formData.get("mobile") || "").trim() || null,
      designation: String(formData.get("designation") || "").trim() || null,
      roleId,
      isActive,
      updatedById: auth.user.id,
    },
  });
  try {
    await saveOverrides(userId, formData, auth.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save permission overrides." };
  }
  await audit({
    actorId: auth.user.id,
    action: roleChanged ? "user_role_changed" : isActive !== target.isActive ? (isActive ? "user_reactivated" : "user_deactivated") : "user_edited",
    entityType: "user",
    entityId: userId,
    affectedUserId: userId,
    before: { roleId: target.roleId, isActive: target.isActive },
    after: { roleId, isActive },
  });
  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${userId}`);
  return { id: userId, ok: true };
}

export async function resetUserPassword(formData: FormData) {
  const auth = await actor("users.reset_password");
  if ("error" in auth) return auth;
  const userId = String(formData.get("userId") || "");
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10), updatedById: auth.user.id },
  });
  await audit({
    actorId: auth.user.id,
    action: "password_reset",
    entityType: "user",
    entityId: userId,
    affectedUserId: userId,
  });
  return { ok: true };
}

export async function resetUserOverrides(formData: FormData) {
  const auth = await actor("permissions.manage");
  if ("error" in auth) return auth;
  const userId = String(formData.get("userId") || "");
  await prisma.userPermissionOverride.deleteMany({ where: { userId } });
  await audit({
    actorId: auth.user.id,
    action: "user_overrides_reset",
    entityType: "user",
    entityId: userId,
    affectedUserId: userId,
  });
  revalidatePath(`/settings/users/${userId}`);
  return { ok: true };
}

export async function createRole(formData: FormData) {
  const auth = await actor("roles.create");
  if ("error" in auth) return auth;
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Role name is required." };
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const exists = await prisma.role.findUnique({ where: { slug } });
  if (exists) return { error: "A role with this name already exists." };
  const role = await prisma.role.create({
    data: {
      name,
      slug,
      description: String(formData.get("description") || "").trim() || null,
      createdById: auth.user.id,
      updatedById: auth.user.id,
    },
  });
  await audit({
    actorId: auth.user.id,
    action: "role_created",
    entityType: "role",
    entityId: role.id,
    after: { name, slug },
  });
  revalidatePath("/settings/roles");
  return { id: role.id };
}

export async function updateRole(formData: FormData) {
  const auth = await actor("roles.edit");
  if ("error" in auth) return auth;
  const roleId = String(formData.get("roleId") || "");
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found." };
  const isActive = String(formData.get("isActive") || "true") === "true";
  if (!isActive && role.slug === "administrator") {
    return { error: "The Administrator role cannot be deactivated." };
  }
  await prisma.role.update({
    where: { id: roleId },
    data: {
      name: String(formData.get("name") || "").trim() || role.name,
      description: String(formData.get("description") || "").trim() || null,
      isActive,
      updatedById: auth.user.id,
    },
  });
  if (await can(auth.user.id, "permissions.manage")) {
    const allowed = new Set(
      formData.getAll("permission").map((v) => String(v)).filter((k) => ALL_PERMISSION_KEYS.includes(k as PermissionKey)),
    );
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (allowed.size) {
      await prisma.rolePermission.createMany({
        data: [...allowed].map((permissionKey) => ({ roleId, permissionKey, allowed: true })),
      });
    }
    await audit({
      actorId: auth.user.id,
      action: "role_permissions_changed",
      entityType: "role",
      entityId: roleId,
      after: { allowed: [...allowed] },
    });
  }
  resetRbacCache();
  revalidatePath("/settings/roles");
  revalidatePath(`/settings/roles/${roleId}`);
  return { id: roleId, ok: true };
}

async function saveOverrides(userId: string, formData: FormData, actorId: string) {
  if (!(await can(actorId, "permissions.manage")) && !(await can(actorId, "users.edit"))) return;
  const target = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (target?.role?.slug === "administrator") {
    const others = await countActiveAdministrators(userId);
    if (others === 0) {
      const protectedKeys = [
        "permissions.manage",
        "users.view",
        "users.edit",
        "users.deactivate",
        "roles.view",
        "roles.edit",
      ] as const;
      for (const key of protectedKeys) {
        if (String(formData.get(`perm:${key}`) || "inherit") === "deny") {
          throw new Error("Cannot remove user-management access from the last administrator.");
        }
      }
    }
  }
  const rows: { userId: string; permissionKey: string; effect: string }[] = [];
  for (const key of ALL_PERMISSION_KEYS) {
    const effect = String(formData.get(`perm:${key}`) || "inherit");
    if (effect === "allow" || effect === "deny") {
      rows.push({ userId, permissionKey: key, effect });
    }
  }
  await prisma.userPermissionOverride.deleteMany({ where: { userId } });
  if (rows.length) await prisma.userPermissionOverride.createMany({ data: rows });
  await audit({
    actorId,
    action: "user_permission_override_changed",
    entityType: "user",
    entityId: userId,
    affectedUserId: userId,
    after: { overrides: rows },
  });
}
