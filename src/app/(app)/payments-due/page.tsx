import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decorateSales, saleInclude } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { money } from "@/lib/money";
import { FollowUpForm } from "@/components/FollowUpForm";
import { field } from "@/components/ui";
import { requirePage } from "@/lib/access";

export default async function PaymentsDuePage({
  searchParams,
}: {
  searchParams: Promise<{
    projectId?: string;
    customer?: string;
    propertyType?: string;
    stage?: string;
  }>;
}) {
  const sp = await searchParams;
  await requirePage("payments_due.view");
  const [projects, salesRaw] = await Promise.all([
    prisma.project.findMany({ include: { currentMilestone: true }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      where: {
        saleStatus: { not: "cancelled" },
        ...(sp.projectId ? { projectId: sp.projectId } : {}),
        ...(sp.propertyType ? { propertyType: sp.propertyType } : {}),
      },
      include: {
        ...saleInclude,
        conversations: { orderBy: { occurredAt: "desc" }, take: 1 },
      },
    }),
  ]);

  let rows = decorateSales(salesRaw).filter((r) => money(r.finance.dueNow).gt(0));
  if (sp.customer) {
    const q = sp.customer.toLowerCase();
    rows = rows.filter((r) => r.sale.customer.fullName.toLowerCase().includes(q));
  }
  if (sp.stage) {
    rows = rows.filter((r) => r.sale.project.currentMilestone?.stageName === sp.stage);
  }

  const stages = [...new Set(projects.map((p) => p.currentMilestone?.stageName).filter(Boolean))] as string[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Payments due now</h1>
        <p className="text-sm text-muted">Everyone with an unpaid amount that has already become payable.</p>
      </div>
      <form className="flex flex-wrap gap-2" method="get">
        <select name="projectId" className={field} defaultValue={sp.projectId || ""}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input name="customer" className={field} placeholder="Customer" defaultValue={sp.customer || ""} />
        <select name="propertyType" className={field} defaultValue={sp.propertyType || ""}>
          <option value="">All types</option>
          <option value="apartment">Apartment</option>
          <option value="villa">Villa</option>
          <option value="plot">Plot</option>
        </select>
        <select name="stage" className={field} defaultValue={sp.stage || ""}>
          <option value="">All current stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-line px-3 text-sm">Filter</button>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">Customer</th>
            <th>Project</th>
            <th>Unit</th>
            <th>Current stage</th>
            <th className="text-right">Due now</th>
            <th className="text-right">Outstanding</th>
            <th>Days since due</th>
            <th>Last conversation</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const last = (row.sale as { conversations?: { notes: string; occurredAt: Date }[] }).conversations?.[0];
            return (
              <tr key={row.sale.id} className="border-t border-line">
                <td className="py-2">
                  <Link className="text-rust" href={`/customers/${row.sale.customerId}`}>
                    {row.sale.customer.fullName}
                  </Link>
                </td>
                <td>{row.sale.project.name}</td>
                <td>{row.unit}</td>
                <td>{row.sale.project.currentMilestone?.stageName ?? "—"}</td>
                <td className="text-right font-medium text-due">{formatINR(row.finance.dueNow)}</td>
                <td className="text-right">{formatINR(row.finance.outstanding)}</td>
                <td>{row.finance.daysSinceDue ?? "—"}</td>
                <td className="max-w-[14rem] truncate text-muted">{last?.notes ?? "—"}</td>
                <td>
                  <FollowUpForm
                    customerId={row.sale.customerId}
                    saleId={row.sale.id}
                    projectId={row.sale.projectId}
                    defaultSubject={`Due now ${formatINR(row.finance.dueNow)}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-sm text-muted">No matching due amounts.</p>}
    </div>
  );
}
