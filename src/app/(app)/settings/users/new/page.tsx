import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";
import { createAccessUser } from "@/app/actions/access";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { OverrideTable } from "@/components/PermissionTables";
import { ALL_PERMISSION_KEYS } from "@/lib/permission-catalog";

export default async function NewUserPage() {
  await requirePage("users.create");
  const roles = await prisma.role.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const defaultRole = roles.find((r) => r.slug === "staff") || roles[0];
  const rolePerms = defaultRole
    ? await prisma.rolePermission.findMany({ where: { roleId: defaultRole.id, allowed: true } })
    : [];
  const inherit: Record<string, "inherit" | "allow" | "deny"> = {};
  for (const k of ALL_PERMISSION_KEYS) inherit[k] = "inherit";
  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/settings/users" className="text-sm text-rust">
        ← Users
      </Link>
      <h1 className="text-2xl font-semibold">New user</h1>
      <p className="text-sm text-muted">
        Select a role to inherit default permissions. Optional overrides can be set below.
      </p>
      <ActionForm className="space-y-4" action={createAccessUser} submitLabel="Create user" successHref="/settings/users/$id">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Full name
            <input name="name" required className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Email
            <input name="email" type="email" required className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Password
            <input name="password" type="password" required minLength={8} className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Mobile
            <input name="mobile" className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Designation
            <input name="designation" className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Role
            <select name="roleId" className={`${field} mt-1`} defaultValue={defaultRole?.id}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-sm text-muted">
          Permissions are inherited from the selected role unless individually overridden. After creating the user,
          open their profile to adjust overrides against the chosen role.
        </p>
        <OverrideTable roleAllowed={rolePerms.map((p) => p.permissionKey as never)} overrides={inherit} />
      </ActionForm>
    </div>
  );
}
