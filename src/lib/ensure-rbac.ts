import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { DEFAULT_ROLES, PERMISSIONS } from "./permission-catalog";

let seeded = false;

export async function ensureRbac() {
  if (seeded) return;
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, action: p.action, label: p.label },
      create: { key: p.key, module: p.module, action: p.action, label: p.label },
    });
  }

  for (const def of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { slug: def.slug },
      update: { name: def.name, description: def.description, isProtected: Boolean(def.isProtected) },
      create: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        isProtected: Boolean(def.isProtected),
        isActive: true,
      },
    });
    const existingRows = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionKey: true },
    });
    const have = new Set(existingRows.map((r) => r.permissionKey));
    const missing = def.permissions.filter((key) => !have.has(key));
    if (missing.length > 0) {
      await prisma.rolePermission.createMany({
        data: missing.map((key) => ({ roleId: role.id, permissionKey: key, allowed: true })),
      });
    }
  }

  const adminRole = await prisma.role.findUnique({ where: { slug: "administrator" } });
  if (adminRole) {
    const users = await prisma.user.findMany();
    for (const user of users) {
      if (!user.roleId) {
        await prisma.user.update({ where: { id: user.id }, data: { roleId: adminRole.id } });
      }
    }
    const count = await prisma.user.count();
    if (count === 0) {
      const email = (process.env.AUTH_EMAIL || "admin@local").trim().toLowerCase();
      const password = process.env.AUTH_PASSWORD || "admin123";
      await prisma.user.create({
        data: {
          email,
          name: "Administrator",
          passwordHash: await bcrypt.hash(password, 10),
          roleId: adminRole.id,
          isActive: true,
        },
      });
    }
  }
  seeded = true;
}

export function resetRbacCache() {
  seeded = false;
}
