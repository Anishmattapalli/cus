import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";
import { btn } from "@/components/ui";

export default async function UsersPage() {
  const { access } = await requirePage("users.view");
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users & access</h1>
        {access.keys.has("users.create") && (
          <Link className={btn} href="/settings/users/new">
            New user
          </Link>
        )}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-line">
              <td className="py-2">
                {u.name}
                <div className="text-xs text-muted">{u.email}</div>
              </td>
              <td>{u.role?.name ?? "—"}</td>
              <td>{u.isActive ? "Active" : "Inactive"}</td>
              <td>{u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-IN") : "Never"}</td>
              <td>
                {access.keys.has("users.edit") && (
                  <Link className="text-rust" href={`/settings/users/${u.id}`}>
                    Edit
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
