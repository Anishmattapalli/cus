import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decorateSales, sumFinances } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { btn } from "@/components/ui";
import { money } from "@/lib/money";
import { saleInclude } from "@/lib/queries";
import { requirePage } from "@/lib/access";

export default async function ProjectsPage() {
  const { access } = await requirePage("projects.view");
  const projects = await prisma.project.findMany({
    include: {
      currentMilestone: true,
      sales: { where: { saleStatus: { not: "cancelled" } }, include: saleInclude },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {access.keys.has("projects.create") && (
        <Link className={btn} href="/projects/new">
          New project
        </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-paper p-1 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">Project</th>
            <th>Type</th>
            <th>Current stage</th>
            <th className="text-right">Est. cost</th>
            <th className="text-right">Sale value</th>
            <th className="text-right">Received</th>
            <th className="text-right">Due now</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const rows = decorateSales(p.sales);
            const t = sumFinances(rows.map((r) => r.finance));
            return (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2">
                  <Link className="text-rust" href={`/projects/${p.id}`}>
                    {p.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {p.code}
                    {p.status !== "active" ? ` · ${p.status.replace("_", " ")}` : ""}
                  </div>
                </td>
                <td className="capitalize">{p.propertyType}</td>
                <td>{p.currentMilestone?.stageName ?? "—"}</td>
                <td className="text-right tabular-nums">
                  {access.keys.has("projects.view_financials") && p.estimatedCost
                    ? formatINR(p.estimatedCost.toString())
                    : "—"}
                </td>
                <td className="text-right tabular-nums">{formatINR(t.saleValue)}</td>
                <td className="text-right tabular-nums">{formatINR(t.received)}</td>
                <td className={`text-right tabular-nums ${money(t.dueNow).gt(0) ? "text-due font-medium" : ""}`}>
                  {formatINR(t.dueNow)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
