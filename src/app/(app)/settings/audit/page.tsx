import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";

export default async function AuditPage() {
  await requirePage("permissions.manage");
  const logs = await prisma.auditLog.findMany({
    include: { actor: true, affectedUser: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <Link href="/settings" className="text-sm text-rust">
        ← Settings
      </Link>
      <h1 className="text-2xl font-semibold">Access audit log</h1>
      <p className="text-sm text-muted">Read-only record of user, role, and permission changes.</p>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">When</th>
            <th>Action</th>
            <th>Performed by</th>
            <th>Affected user</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((row) => (
            <tr key={row.id} className="border-t border-line align-top">
              <td className="py-2 whitespace-nowrap">{row.createdAt.toLocaleString("en-IN")}</td>
              <td>{row.action}</td>
              <td>{row.actor?.name ?? "—"}</td>
              <td>{row.affectedUser?.name ?? "—"}</td>
              <td className="max-w-md break-all text-xs text-muted">
                {row.beforeJson ? `before: ${row.beforeJson} ` : ""}
                {row.afterJson ? `after: ${row.afterJson}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
