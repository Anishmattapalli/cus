import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";
import { createRole } from "@/app/actions/access";
import { ActionForm } from "@/components/ActionForm";
import { btn, field } from "@/components/ui";

export default async function RolesPage() {
  const { access } = await requirePage("roles.view");
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles & permissions</h1>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">Role</th>
            <th className="text-right">Users</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="py-2">{r.name}</td>
              <td className="text-right">{r._count.users}</td>
              <td>{r.isActive ? "Active" : "Inactive"}</td>
              <td>
                {access.keys.has("roles.edit") && (
                  <Link className="text-rust" href={`/settings/roles/${r.id}`}>
                    Edit
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {access.keys.has("roles.create") && (
        <ActionForm className="max-w-md space-y-2" action={createRole} submitLabel="Create role" successHref="/settings/roles/$id">
          <input name="name" className={field} placeholder="Role name" required />
          <textarea name="description" className={field} rows={2} placeholder="Description" />
        </ActionForm>
      )}
    </div>
  );
}
