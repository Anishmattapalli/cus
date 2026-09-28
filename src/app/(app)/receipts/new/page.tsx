import { prisma } from "@/lib/prisma";
import { createReceipt } from "@/app/actions/records";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { unitLabel } from "@/lib/ops";
import { requirePage } from "@/lib/access";

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; saleId?: string }>;
}) {
  await requirePage("receipts.create");
  const sp = await searchParams;
  const sales = await prisma.sale.findMany({
    where: { saleStatus: { not: "cancelled" } },
    include: { customer: true, project: true },
    orderBy: { createdAt: "desc" },
  });
  const filtered = sp.customerId ? sales.filter((s) => s.customerId === sp.customerId) : sales;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Record receipt</h1>
      <p className="text-sm text-muted">
        Receipts are the source of truth for amount received. They are allocated to the oldest unpaid milestone first.
        Changing a project stage never creates a receipt.
      </p>
      <ActionForm
        className="space-y-3"
        action={createReceipt}
        submitLabel="Save receipt"
        successHref="/customers/$customerId?tab=receipts"
      >
        <label className="block text-sm">
          Sale
          <select name="saleId" className={`${field} mt-1`} defaultValue={sp.saleId || ""} required>
            <option value="">Select…</option>
            {filtered.map((s) => (
              <option key={s.id} value={s.id}>
                {s.saleCode} · {s.customer.fullName} · {s.project.name} · {unitLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Amount (₹)
          <input name="amount" required className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          Date
          <input name="receiptDate" type="date" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          Payment mode
          <select name="paymentMode" className={`${field} mt-1`} defaultValue="neft">
            {["cash", "bank_transfer", "neft", "rtgs", "imps", "upi", "cheque", "other"].map((m) => (
              <option key={m} value={m}>
                {m.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Bank
          <input name="bankName" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          UTR / transaction number
          <input name="utrOrTransactionNumber" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          Cheque number
          <input name="chequeNumber" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          Remarks
          <textarea name="remarks" className={`${field} mt-1`} rows={2} />
        </label>
      </ActionForm>
    </div>
  );
}
