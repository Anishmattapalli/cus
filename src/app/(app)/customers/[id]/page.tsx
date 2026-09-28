import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decorateSales, saleInclude, sumFinances } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { money } from "@/lib/money";
import { Panel, Stat, field, btnGhost } from "@/components/ui";
import { FollowUpForm } from "@/components/FollowUpForm";
import { ActionForm } from "@/components/ActionForm";
import { cancelCustomerBookings, cancelSale, deleteCustomer, saveDocumentMeta, updateCustomerNotes } from "@/app/actions/records";
import { CancelReceipt } from "@/components/CancelReceipt";
import { SaleStageEditor } from "@/components/SaleStageEditor";
import { sumStagePercentages } from "@/lib/finance";
import { requirePage } from "@/lib/access";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { access } = await requirePage("customers.view");
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: { include: saleInclude, orderBy: { createdAt: "desc" } },
      receipts: { include: { sale: true, project: true }, orderBy: { receiptDate: "desc" } },
      conversations: { orderBy: { occurredAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!customer) notFound();
  const showFin = access.keys.has("customers.view_financials") || access.keys.has("sales.view_financials");
  const canEdit = access.keys.has("customers.edit");
  const canSale = access.keys.has("sales.create");
  const canSaleEdit = access.keys.has("sales.edit");
  const canSchedule = access.keys.has("payment_schedule.view");
  const canScheduleEdit = access.keys.has("payment_schedule.edit");
  const canReceipts = access.keys.has("receipts.view");
  const canReceiptCreate = access.keys.has("receipts.create");
  const canReceiptCancel = access.keys.has("receipts.cancel");
  const canDocs = access.keys.has("documents.view");
  const canDocUpload = access.keys.has("documents.upload");
  const canConv = access.keys.has("conversations.view");
  const canConvCreate = access.keys.has("conversations.create");
  const canNotes = access.keys.has("customers.edit");
  const canArchive = access.keys.has("customers.archive");
  const canCancelSale = access.keys.has("sales.cancel");

  const activeSales = decorateSales(customer.sales.filter((s) => s.saleStatus !== "cancelled"));
  const cancelledSales = decorateSales(customer.sales.filter((s) => s.saleStatus === "cancelled"));
  const totals = sumFinances(activeSales.map((s) => s.finance));
  const tabs: [string, string][] = [
    ["overview", "Overview"],
    ["purchases", "Purchases"],
  ];
  if (canSchedule) tabs.push(["schedule", "Payment schedule"]);
  if (canReceipts) tabs.push(["receipts", "Receipts"]);
  if (canDocs) tabs.push(["documents", "Documents"]);
  if (canConv) tabs.push(["conversations", "Conversations"]);
  if (canNotes) tabs.push(["notes", "Notes"]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{customer.customerCode}</p>
          <h1 className="text-2xl font-semibold">{customer.fullName}</h1>
          <p className="text-sm text-muted">
            {customer.primaryMobile}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
          <Link className={btnGhost} href={`/customers/${customer.id}/edit`}>
            Edit customer
          </Link>
          )}
          {canConvCreate && (
          <FollowUpForm customerId={customer.id} defaultSubject="Payment follow-up" />
          )}
          {canArchive && activeSales.length > 0 && (
            <ActionForm
              className="flex flex-wrap items-end gap-2"
              action={cancelCustomerBookings}
              submitLabel="Cancel after advance"
              variant="danger"
              confirmMessage="Cancel this customer’s active bookings? Receipts already recorded (including advance) stay in history. Due amounts leave the dashboard."
            >
              <input type="hidden" name="customerId" value={customer.id} />
              <input name="reason" className={`${field} w-48`} placeholder="Reason (optional)" />
            </ActionForm>
          )}
          {canArchive && (
            <ActionForm
              className="flex items-center"
              action={deleteCustomer}
              submitLabel="Delete"
              variant="danger"
              successHref="/customers"
              confirmMessage="Permanently delete this customer? If they have bookings or receipts, deletion is blocked — cancel the booking instead so the advance stays."
            >
              <input type="hidden" name="customerId" value={customer.id} />
            </ActionForm>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat tone="amber" label="Purchase value" value={showFin ? formatINR(totals.saleValue) : "—"} />
        <Stat tone="green" label="Received" value={showFin ? formatINR(totals.received) : "—"} />
        <Stat tone="orange" label="Outstanding" value={showFin ? formatINR(totals.outstanding) : "—"} />
        <Stat tone="rose" label="Due now" value={showFin ? formatINR(totals.dueNow) : "—"} warn={showFin && money(totals.dueNow).gt(0)} />
        <Stat tone="blue" label="Future outstanding" value={showFin ? formatINR(totals.futureOutstanding) : "—"} />
      </div>
      <div className="flex flex-wrap gap-2 border-b border-line pb-2 text-sm">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/customers/${id}?tab=${key}`}
            className={`rounded-md px-3 py-1 ${tab === key ? "bg-rust text-white" : "hover:bg-sand"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Basic">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">Type</dt>
              <dd className="capitalize">{customer.customerType}</dd>
              <dt className="text-muted">PAN</dt>
              <dd>{customer.pan || "—"}</dd>
              <dt className="text-muted">Status</dt>
              <dd className="capitalize">
                {customer.status}
                {cancelledSales.length > 0 ? ` · ${cancelledSales.length} cancelled booking(s)` : ""}
              </dd>
              <dt className="text-muted">Sales person</dt>
              <dd>{customer.salesPerson || "—"}</dd>
            </dl>
          </Panel>
          <Panel title="Sales">
            <ul className="space-y-3 text-sm">
              {activeSales.map((row) => (
                <li key={row.sale.id} className="border-b border-line pb-2">
                  <div className="font-medium">
                    {row.sale.project.name} · {row.unit}
                  </div>
                  <div className="text-muted">
                    {showFin ? (
                      <>
                    Sale {formatINR(row.finance.saleValue)} · Received {formatINR(row.finance.received)} · Due now{" "}
                    <span className="text-due">{formatINR(row.finance.dueNow)}</span>
                      </>
                    ) : (
                      "Financials hidden"
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {tab === "purchases" && (
        <div className="space-y-4">
        <Panel
          title="Purchases"
          action={
            canSale ? (
            <Link className="text-sm text-rust" href={`/sales/new?customerId=${customer.id}`}>
              Add sale
            </Link>
            ) : undefined
          }
        >
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2 text-left">Project</th>
                <th>Unit</th>
                <th className="text-right">Sale value</th>
                <th className="text-right">Received</th>
                <th className="text-right">Outstanding</th>
                <th className="text-right">Due now</th>
                <th className="text-right">Future</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeSales.map((row) => (
                <tr key={row.sale.id} className="border-t border-line">
                  <td className="py-2">
                    <Link className="text-rust" href={`/projects/${row.sale.projectId}`}>
                      {row.sale.project.name}
                    </Link>
                    <div className="text-xs text-muted">{row.sale.saleCode}</div>
                  </td>
                  <td>{row.unit}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.saleValue) : "—"}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.received) : "—"}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.outstanding) : "—"}</td>
                  <td className="text-right text-due">{showFin ? formatINR(row.finance.dueNow) : "—"}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.futureOutstanding) : "—"}</td>
                  <td className="space-x-2 text-right">
                    {canSaleEdit && (
                    <Link className="text-rust" href={`/sales/${row.sale.id}/edit`}>
                      Edit
                    </Link>
                    )}
                    {canCancelSale && (
                      <ActionForm
                        className="inline-flex"
                        action={cancelSale}
                        submitLabel="Cancel"
                        variant="danger"
                        confirmMessage="Cancel this booking? Advance already received stays on the receipts list. It will no longer appear as due."
                      >
                        <input type="hidden" name="saleId" value={row.sale.id} />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        {cancelledSales.length > 0 && (
          <Panel title="Cancelled after advance">
            <p className="mb-3 text-sm text-muted">
              Booking is cancelled. Money already received stays recorded on Receipts — it is not deleted.
            </p>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 text-left">Project</th>
                  <th>Unit</th>
                  <th className="text-right">Sale value</th>
                  <th className="text-right">Advance kept</th>
                </tr>
              </thead>
              <tbody>
                {cancelledSales.map((row) => (
                  <tr key={row.sale.id} className="border-t border-line">
                    <td className="py-2">
                      <Link className="text-rust" href={`/projects/${row.sale.projectId}`}>
                        {row.sale.project.name}
                      </Link>
                      <div className="text-xs text-muted">{row.sale.saleCode}</div>
                    </td>
                    <td>{row.unit}</td>
                    <td className="text-right">{showFin ? formatINR(row.finance.saleValue) : "—"}</td>
                    <td className="text-right">{showFin ? formatINR(row.finance.received) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
        </div>
      )}

      {tab === "schedule" &&
        activeSales.map((row) => {
          const remaining = money(100).minus(sumStagePercentages(row.sale.milestones));
          return (
          <Panel
            key={row.sale.id}
            title={`${row.sale.project.name} · ${row.unit} · ${row.sale.saleCode}${row.sale.scheduleIsCustomized ? " · customized" : ""}`}
            action={
              canSaleEdit ? (
              <Link className="text-sm text-rust" href={`/sales/${row.sale.id}/edit`}>
                Edit sale
              </Link>
              ) : undefined
            }
          >
            <table className="mb-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-1 text-left">Stage</th>
                  <th className="text-right">%</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Balance</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {row.finance.milestones.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-1">{m.stageName}</td>
                    <td className="text-right">{m.paymentPercentage ?? "—"}</td>
                    <td className="text-right">{showFin ? formatINR(m.amountDue) : "—"}</td>
                    <td className="text-right">{showFin ? formatINR(m.amountPaid) : "—"}</td>
                    <td className="text-right">{showFin ? formatINR(m.balance) : "—"}</td>
                    <td className={m.status === "Due Now" ? "text-due font-medium" : ""}>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {canScheduleEdit && (
            <SaleStageEditor
              saleId={row.sale.id}
              remainingPct={remaining.gt(0) ? remaining.toFixed(2) : "0"}
              milestones={row.sale.milestones.map((m) => {
                const fin = row.finance.milestones.find((x) => x.id === m.id);
                return {
                  id: m.id,
                  sequenceNumber: m.sequenceNumber,
                  stageName: m.stageName,
                  description: m.description,
                  calculationType: m.calculationType,
                  paymentPercentage: m.paymentPercentage?.toString() ?? "",
                  amountDue: m.amountDue.toString(),
                  amountPaid: fin ? formatINR(fin.amountPaid) : formatINR(0),
                };
              })}
            />
            )}
          </Panel>
          );
        })}

      {tab === "receipts" && (
        <Panel
          title="Receipts"
          action={
            canReceiptCreate ? (
            <Link className="text-sm text-rust" href={`/receipts/new?customerId=${customer.id}`}>
              Record receipt
            </Link>
            ) : undefined
          }
        >
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2 text-left">Number</th>
                <th>Project / unit</th>
                <th>Date</th>
                <th className="text-right">Amount</th>
                <th>Mode</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customer.receipts.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2">{r.receiptNumber}</td>
                  <td>
                    {r.project.name} · {r.sale.unitNumber || r.sale.flatNumber || r.sale.plotNumber}
                    {r.sale.saleStatus === "cancelled" ? (
                      <div className="text-xs text-muted">Cancelled booking — receipt kept</div>
                    ) : null}
                  </td>
                  <td>{r.receiptDate.toLocaleDateString("en-IN")}</td>
                  <td className="text-right">{formatINR(r.amount.toString())}</td>
                  <td className="uppercase">{r.paymentMode}</td>
                  <td>{r.status === "active" && canReceiptCancel ? <CancelReceipt id={r.id} /> : r.status !== "active" ? <span className="text-muted">Cancelled</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "documents" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Documents">
            <ul className="space-y-2 text-sm">
              {customer.documents.map((d) => (
                <li key={d.id}>
                  {d.name} · {d.documentType}
                </li>
              ))}
            </ul>
          </Panel>
          {canDocUpload && (
          <Panel title="Add document record">
            <ActionForm className="space-y-2" action={saveDocumentMeta} submitLabel="Save">
              <input type="hidden" name="customerId" value={customer.id} />
              <input name="name" className={field} placeholder="Document name" required />
              <select name="documentType" className={field} defaultValue="other">
                {["pan", "id_proof", "booking_form", "agreement", "sale_deed", "payment_proof", "bank_document", "correspondence", "other"].map(
                  (t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ),
                )}
              </select>
              <textarea name="description" className={field} rows={2} placeholder="Description" />
            </ActionForm>
          </Panel>
          )}
        </div>
      )}

      {tab === "conversations" && (
        <Panel title="Timeline">
          <ul className="space-y-3">
            {customer.conversations.map((c) => (
              <li key={c.id} className="border-l-2 border-rust pl-3 text-sm">
                <div className="text-muted">
                  {c.occurredAt.toLocaleString("en-IN")} · {c.interactionType.replaceAll("_", " ")}
                </div>
                {c.subject && <div className="font-medium">{c.subject}</div>}
                <p>{c.notes}</p>
                {c.followUpRequired && (
                  <p className="text-due">Follow-up: {c.followUpAt?.toLocaleDateString("en-IN")}</p>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === "notes" && (
        <Panel title="Internal notes">
          <ActionForm className="space-y-3" action={updateCustomerNotes} submitLabel="Save notes">
            <input type="hidden" name="customerId" value={customer.id} />
            <textarea name="internalNotes" className={field} rows={6} defaultValue={customer.internalNotes ?? ""} />
          </ActionForm>
        </Panel>
      )}
    </div>
  );
}
