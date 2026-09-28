import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decorateSales, saleInclude, sumFinances } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { btn } from "@/components/ui";
import { money } from "@/lib/money";
import { requirePage } from "@/lib/access";

export default async function CustomersPage() {
  const { access } = await requirePage("customers.view");
  const showFin = access.keys.has("customers.view_financials");
  const customers = await prisma.customer.findMany({
    include: { sales: { where: { saleStatus: { not: "cancelled" } }, include: saleInclude } },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        {access.keys.has("customers.create") && (
        <Link className={btn} href="/customers/new">
          New customer
        </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-paper p-1 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">Customer</th>
            <th>Mobile</th>
            <th>Properties</th>
            <th className="text-right">Purchase value</th>
            <th className="text-right">Received</th>
            <th className="text-right">Outstanding</th>
            <th className="text-right">Due now</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const rows = decorateSales(c.sales);
            const t = sumFinances(rows.map((r) => r.finance));
            return (
              <tr key={c.id} className="border-t border-line">
                <td className="py-2">
                  <Link className="text-rust" href={`/customers/${c.id}`}>
                    {c.fullName}
                  </Link>
                  <div className="text-xs text-muted">
                    {c.customerCode}
                    {c.status !== "active" ? ` · ${c.status}` : ""}
                  </div>
                </td>
                <td>{c.primaryMobile}</td>
                <td>{c.sales.length}</td>
                <td className="text-right">{showFin ? formatINR(t.saleValue) : "—"}</td>
                <td className="text-right">{showFin ? formatINR(t.received) : "—"}</td>
                <td className="text-right">{showFin ? formatINR(t.outstanding) : "—"}</td>
                <td className={`text-right ${showFin && money(t.dueNow).gt(0) ? "text-due font-medium" : ""}`}>
                  {showFin ? formatINR(t.dueNow) : "—"}
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
