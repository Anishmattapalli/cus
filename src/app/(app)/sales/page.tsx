import Link from "next/link";
import { decorateSales, loadAllActiveSales } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { btn } from "@/components/ui";
import { money } from "@/lib/money";
import { requirePage } from "@/lib/access";

export default async function SalesPage() {
  const { access } = await requirePage("sales.view");
  const showFin = access.keys.has("sales.view_financials");
  const sales = decorateSales(await loadAllActiveSales());
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales / Units</h1>
        {access.keys.has("sales.create") && (
        <Link className={btn} href="/sales/new">
          New sale
        </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-paper p-1 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">Sale</th>
            <th>Customer</th>
            <th>Project</th>
            <th>Unit</th>
            <th className="text-right">Value</th>
            <th className="text-right">Received</th>
            <th className="text-right">Due now</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((row) => (
            <tr key={row.sale.id} className="border-t border-line">
              <td className="py-2">{row.sale.saleCode}</td>
              <td>
                <Link className="text-rust" href={`/customers/${row.sale.customerId}`}>
                  {row.sale.customer.fullName}
                </Link>
              </td>
              <td>
                <Link className="text-rust" href={`/projects/${row.sale.projectId}`}>
                  {row.sale.project.name}
                </Link>
              </td>
              <td>{row.unit}</td>
              <td className="text-right">{showFin ? formatINR(row.finance.saleValue) : "—"}</td>
              <td className="text-right">{showFin ? formatINR(row.finance.received) : "—"}</td>
              <td className={`text-right ${showFin && money(row.finance.dueNow).gt(0) ? "text-due font-medium" : ""}`}>
                {showFin ? formatINR(row.finance.dueNow) : "—"}
              </td>
              <td>
                {access.keys.has("sales.edit") && (
                <Link className="text-rust" href={`/sales/${row.sale.id}/edit`}>
                  Edit
                </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
