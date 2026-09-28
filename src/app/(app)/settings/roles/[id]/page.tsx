import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";
import { updateRole } from "@/app/actions/access";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { RolePermissionChecks } from "@/components/PermissionTables";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("roles.edit");
  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: { permissions: true, users: { select: { id: true, name: true, email: true, isActive: true } } },
  });
  if (!role) notFound();
  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/settings/roles" className="text-sm text-rust">
        ← Roles
      </Link>
      <h1 className="text-2xl font-semibold">Edit role</h1>
      <ActionForm className="space-y-4" action={updateRole} submitLabel="Save role">
        <input type="hidden" name="roleId" value={role.id} />
        <label className="block text-sm">
          Name
          <input name="name" required className={`${field} mt-1`} defaultValue={role.name} />
        </label>
        <label className="block text-sm">
          Description
          <textarea name="description" className={`${field} mt-1`} rows={2} defaultValue={role.description ?? ""} />
        </label>
        <label className="block text-sm">
          Status
          <select name="isActive" className={`${field} mt-1`} defaultValue={role.isActive ? "true" : "false"}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <h2 className="text-lg font-semibold">Default permissions</h2>
        <p className="text-sm text-muted">
          Users inherit these unless they have an individual override. Changing a role updates all inheriting users
          immediately.
        </p>
        <RolePermissionChecks allowed={role.permissions.filter((p) => p.allowed).map((p) => p.permissionKey)} />
      </ActionForm>
      <div>
        <h2 className="text-lg font-semibold">Assigned users</h2>
        <ul className="text-sm">
          {role.users.map((u) => (
            <li key={u.id}>
              {u.name} · {u.email} · {u.isActive ? "Active" : "Inactive"}
            </li>
          ))}
          {role.users.length === 0 && <li className="text-muted">None</li>}
        </ul>
      </div>
    </div>
  );
}
