import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { effectiveAllowed } from "../src/lib/effective-permission";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLES } from "../src/lib/permission-catalog";

const prisma = new PrismaClient();

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function effectiveKeys(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } }, permissionOverrides: true },
  });
  if (!user?.role) throw new Error("user has no role");
  const roleAllowed = new Set(user.role.permissions.filter((p) => p.allowed).map((p) => p.permissionKey));
  const overrides = new Map(user.permissionOverrides.map((p) => [p.permissionKey, p.effect as "allow" | "deny"]));
  const keys = new Set<string>();
  for (const key of ALL_PERMISSION_KEYS) {
    if (effectiveAllowed(roleAllowed.has(key), overrides.get(key))) keys.add(key);
  }
  return keys;
}

async function main() {
  assert(effectiveAllowed(false, undefined) === false, "inherit deny");
  assert(effectiveAllowed(true, undefined) === true, "inherit allow");
  assert(effectiveAllowed(false, "allow") === true, "override allow");
  assert(effectiveAllowed(true, "deny") === false, "override deny");
  assert(effectiveAllowed(false, "deny") === false, "deny stays deny");

  const salesDefaults = DEFAULT_ROLES.find((r) => r.slug === "sales-representative")!.permissions;
  assert(!salesDefaults.includes("receipts.view"), "sales default has no receipts.view");
  assert(salesDefaults.includes("customers.edit"), "sales default has customers.edit");
  const accountant = DEFAULT_ROLES.find((r) => r.slug === "accountant")!.permissions;
  assert(accountant.includes("receipts.create"), "accountant can create receipts");
  assert(!accountant.includes("projects.change_stage"), "accountant cannot change stage");

  const { ensureRbac, resetRbacCache } = await import("../src/lib/ensure-rbac");
  resetRbacCache();
  await ensureRbac();

  const salesRole = await prisma.role.findUnique({ where: { slug: "sales-representative" } });
  const directorRole = await prisma.role.findUnique({ where: { slug: "director" } });
  const accountantRole = await prisma.role.findUnique({ where: { slug: "accountant" } });
  if (!salesRole || !directorRole || !accountantRole) throw new Error("roles missing");

  const hash = await bcrypt.hash("TestPass9", 10);
  await prisma.user.deleteMany({ where: { email: { in: ["ravi.test@local", "suresh.test@local", "other.sales@local"] } } });

  const ravi = await prisma.user.create({
    data: { email: "ravi.test@local", name: "Ravi", passwordHash: hash, roleId: accountantRole.id, isActive: true },
  });
  const suresh = await prisma.user.create({
    data: { email: "suresh.test@local", name: "Suresh", passwordHash: hash, roleId: salesRole.id, isActive: true },
  });
  const other = await prisma.user.create({
    data: { email: "other.sales@local", name: "Other Sales", passwordHash: hash, roleId: salesRole.id, isActive: true },
  });

  const raviKeys = await effectiveKeys(ravi.id);
  assert(raviKeys.has("receipts.create"), "Test 2 accountant receipts.create");
  assert(!raviKeys.has("users.create"), "Test 2 accountant no users.create");

  let sureshKeys = await effectiveKeys(suresh.id);
  assert(sureshKeys.has("customers.edit"), "Test 3 sales customers.edit");
  assert(!sureshKeys.has("receipts.view"), "Test 3 sales no receipts.view");

  await prisma.userPermissionOverride.create({
    data: { userId: suresh.id, permissionKey: "receipts.view", effect: "allow" },
  });
  sureshKeys = await effectiveKeys(suresh.id);
  const otherKeys = await effectiveKeys(other.id);
  assert(sureshKeys.has("receipts.view"), "Test 4 suresh receipts.view allow");
  assert(!otherKeys.has("receipts.view"), "Test 4 other sales no receipts.view");

  await prisma.userPermissionOverride.create({
    data: { userId: suresh.id, permissionKey: "customers.edit", effect: "deny" },
  });
  sureshKeys = await effectiveKeys(suresh.id);
  assert(!sureshKeys.has("customers.edit"), "Test 5 suresh customers.edit deny");
  assert((await effectiveKeys(other.id)).has("customers.edit"), "Test 5 other still edits customers");

  await prisma.userPermissionOverride.delete({
    where: { userId_permissionKey: { userId: suresh.id, permissionKey: "customers.edit" } },
  });
  sureshKeys = await effectiveKeys(suresh.id);
  assert(sureshKeys.has("customers.edit"), "Test 6 inherit restores customers.edit");

  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionKey: { roleId: salesRole.id, permissionKey: "customers.edit" } },
  });
  if (existing) {
    await prisma.rolePermission.update({
      where: { roleId_permissionKey: { roleId: salesRole.id, permissionKey: "customers.edit" } },
      data: { allowed: false },
    });
  } else {
    await prisma.rolePermission.create({
      data: { roleId: salesRole.id, permissionKey: "customers.edit", allowed: false },
    });
  }
  assert(!(await effectiveKeys(other.id)).has("customers.edit"), "Test 7 inheritors lose customers.edit");
  await prisma.userPermissionOverride.create({
    data: { userId: suresh.id, permissionKey: "customers.edit", effect: "allow" },
  });
  assert((await effectiveKeys(suresh.id)).has("customers.edit"), "Test 7 override still allows");

  await prisma.user.update({ where: { id: suresh.id }, data: { roleId: directorRole.id } });
  sureshKeys = await effectiveKeys(suresh.id);
  assert(sureshKeys.has("projects.view_financials"), "Test 8 director financials");
  assert(sureshKeys.has("receipts.view"), "Test 8 receipts.view override remains");

  await prisma.userPermissionOverride.deleteMany({ where: { userId: suresh.id } });
  sureshKeys = await effectiveKeys(suresh.id);
  assert(sureshKeys.has("receipts.view"), "Test 9 director default receipts.view");
  assert(!sureshKeys.has("users.create"), "Test 9 director no users.create");

  await prisma.user.update({ where: { id: suresh.id }, data: { isActive: false } });
  const inactive = await prisma.user.findUnique({ where: { id: suresh.id } });
  assert(inactive?.isActive === false, "Test 11 deactivated");
  assert(inactive != null, "Test 11 row remains");

  await prisma.rolePermission.updateMany({
    where: { roleId: salesRole.id, permissionKey: "customers.edit" },
    data: { allowed: true },
  });
  await prisma.user.deleteMany({ where: { email: { in: ["ravi.test@local", "suresh.test@local", "other.sales@local"] } } });

  console.log("RBAC tests passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
