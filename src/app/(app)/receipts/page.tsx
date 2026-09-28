import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { btn } from "@/components/ui";
import { CancelReceipt } from "@/components/CancelReceipt";
import { requirePage } from "@/lib/access";

export default async function ReceiptsPage() {
  const { access } = await requirePage("receipts.view");
  const receipts = await prisma.receipt.findMany({
    include: { customer: true, sale: true, project: true },
    orderBy: { receiptDate: "desc" },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Receipts</h1>
        {access.keys.has("receipts.create") && (
        <Link className={btn} href="/receipts/new">
          Record receipt
        </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-paper p-1 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2">Number</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Project</th>
            <th className="text-right">Amount</th>
            <th>Mode</th>
            <th>UTR</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="py-2">{r.receiptNumber}</td>
              <td>{r.receiptDate.toLocaleDateString("en-IN")}</td>
              <td>
                <Link className="text-rust" href={`/customers/${r.customerId}`}>
                  {r.customer.fullName}
                </Link>
              </td>
              <td>{r.project.name}</td>
              <td className="text-right">{formatINR(r.amount.toString())}</td>
              <td className="uppercase">{r.paymentMode}</td>
              <td>{r.utrOrTransactionNumber || "—"}</td>
              <td>{r.status}</td>
                    <td>{r.status === "active" && access.keys.has("receipts.cancel") ? <CancelReceipt id={r.id} /> : r.status !== "active" ? null : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
