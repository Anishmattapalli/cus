import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";
import { resetUserOverrides, resetUserPassword, updateAccessUser } from "@/app/actions/access";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { OverrideTable } from "@/components/PermissionTables";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/permission-catalog";
import { loadEffectiveAccess } from "@/lib/access";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { access } = await requirePage("users.edit");
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { role: { include: { permissions: true } }, permissionOverrides: true },
  });
  if (!user) notFound();
  const roles = await prisma.role.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const effective = await loadEffectiveAccess(user.id);
  const roleAllowed = user.role?.permissions.filter((p) => p.allowed).map((p) => p.permissionKey as PermissionKey) ?? [];
  const overrides: Record<string, "inherit" | "allow" | "deny"> = {};
  for (const k of ALL_PERMISSION_KEYS) overrides[k] = "inherit";
  for (const row of user.permissionOverrides) {
    if (row.effect === "allow" || row.effect === "deny") overrides[row.permissionKey] = row.effect;
  }
  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/settings/users" className="text-sm text-rust">
        ← Users
      </Link>
      <h1 className="text-2xl font-semibold">Edit user</h1>
      <p className="text-sm text-muted">
        {user.email} · Last login {user.lastLoginAt ? user.lastLoginAt.toLocaleString("en-IN") : "never"}
      </p>
      <p className="text-sm">
        Assigned role: <strong>{user.role?.name}</strong>. Permissions are inherited from this role unless individually
        overridden.
      </p>
      <ActionForm
        className="space-y-4"
        action={updateAccessUser}
        submitLabel="Save user"
        confirmMessage="Changing this user's role will change their inherited permissions. Existing individual overrides will remain unless reset."
        confirmField="roleId"
        confirmInitial={user.roleId ?? ""}
      >
        <input type="hidden" name="userId" value={user.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Full name
            <input name="name" required className={`${field} mt-1`} defaultValue={user.name} />
          </label>
          <label className="block text-sm">
            Mobile
            <input name="mobile" className={`${field} mt-1`} defaultValue={user.mobile ?? ""} />
          </label>
          <label className="block text-sm">
            Designation
            <input name="designation" className={`${field} mt-1`} defaultValue={user.designation ?? ""} />
          </label>
          <label className="block text-sm">
            Role
            <select name="roleId" className={`${field} mt-1`} defaultValue={user.roleId ?? ""}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Status
            <select name="isActive" className={`${field} mt-1`} defaultValue={user.isActive ? "true" : "false"}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>
        <p className="rounded-md border border-line bg-sand px-3 py-2 text-xs">
          Changing this user&apos;s role will change their inherited permissions. Existing individual overrides will
          remain unless reset.
        </p>
        <h2 className="text-lg font-semibold">Permission overrides</h2>
        <OverrideTable roleAllowed={roleAllowed} overrides={overrides} />
      </ActionForm>
      {access.keys.has("permissions.manage") && (
        <ActionForm action={resetUserOverrides} submitLabel="Reset all user overrides">
          <input type="hidden" name="userId" value={user.id} />
        </ActionForm>
      )}
      {access.keys.has("users.reset_password") && (
        <ActionForm className="max-w-sm space-y-2" action={resetUserPassword} submitLabel="Reset password">
          <input type="hidden" name="userId" value={user.id} />
          <input name="password" type="password" minLength={8} className={field} placeholder="New password" required />
        </ActionForm>
      )}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Effective access</h2>
        <p className="text-sm text-muted">{effective ? [...effective.keys].join(", ") : "No access"}</p>
      </div>
    </div>
  );
}
