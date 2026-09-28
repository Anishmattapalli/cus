import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decorateSales, saleInclude, sumFinances } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { money } from "@/lib/money";
import { Panel, Stat, field, btnGhost } from "@/components/ui";
import { StageChange } from "@/components/StageChange";
import { ActionForm } from "@/components/ActionForm";
import { addProjectMilestone, archiveProject, deleteProject } from "@/app/actions/projects";
import { FollowUpForm } from "@/components/FollowUpForm";
import { StageEditor } from "@/components/StageEditor";
import { sumStagePercentages } from "@/lib/finance";
import { requirePage } from "@/lib/access";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { access } = await requirePage("projects.view");
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      currentMilestone: true,
      milestones: { orderBy: { sequenceNumber: "asc" } },
      stageHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: true } },
      sales: { include: saleInclude, orderBy: { createdAt: "desc" } },
      receipts: { include: { customer: true, sale: true }, orderBy: { receiptDate: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      conversations: { include: { customer: true }, orderBy: { occurredAt: "desc" } },
    },
  });
  if (!project) notFound();
  const showFin = access.keys.has("projects.view_financials");
  const canEdit = access.keys.has("projects.edit");
  const canStage = access.keys.has("projects.change_stage");
  const canScheduleEdit = access.keys.has("payment_schedule.edit") || access.keys.has("payment_schedule.create");
  const canReceipts = access.keys.has("receipts.view");
  const canReceiptCreate = access.keys.has("receipts.create");
  const canDocs = access.keys.has("documents.view");
  const canConv = access.keys.has("conversations.view");
  const canConvCreate = access.keys.has("conversations.create");

  const canArchive = access.keys.has("projects.archive");
  const sales = decorateSales(project.sales.filter((s) => s.saleStatus !== "cancelled"));
  const cancelledSales = decorateSales(project.sales.filter((s) => s.saleStatus === "cancelled"));
  const totals = sumFinances(sales.map((s) => s.finance));
  const currentSeq = project.currentMilestone?.sequenceNumber ?? 0;
  const tabs: [string, string][] = [
    ["overview", "Overview"],
    ["customers", "Customers"],
    ["stages", "Payment stages"],
  ];
  if (canReceipts) tabs.push(["receipts", "Receipts"]);
  if (canDocs) tabs.push(["documents", "Documents"]);
  if (canConv) tabs.push(["conversations", "Conversations"]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted">{project.code}</p>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted capitalize">
            {project.propertyType} · {project.status.replace("_", " ")} · Current stage:{" "}
            <span className="font-medium text-ink">{project.currentMilestone?.stageName ?? "Not set"}</span>
            {project.location ? ` · ${project.location}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
          <Link className={btnGhost} href={`/projects/${project.id}/edit`}>
            Edit project
          </Link>
          )}
          {canArchive && project.status !== "archived" && (
            <ActionForm
              className="flex items-center"
              action={archiveProject}
              submitLabel="Archive"
              variant="danger"
              confirmMessage="Archive this project? Sales and receipts stay in history. It will no longer be treated as an active project."
            >
              <input type="hidden" name="projectId" value={project.id} />
            </ActionForm>
          )}
          {canArchive && (
            <ActionForm
              className="flex items-center"
              action={deleteProject}
              submitLabel="Delete"
              variant="danger"
              successHref="/projects"
              confirmMessage="Permanently delete this project? If it has sales or receipts, deletion is blocked — archive it instead so payment history stays."
            >
              <input type="hidden" name="projectId" value={project.id} />
            </ActionForm>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat tone="indigo" label="Customers / units" value={String(sales.length)} />
        {showFin && project.estimatedCost ? (
          <Stat tone="amber" label="Est. project cost" value={formatINR(project.estimatedCost.toString())} />
        ) : null}
        <Stat tone="amber" label="Total sale value" value={showFin ? formatINR(totals.saleValue) : "—"} />
        <Stat tone="green" label="Received" value={showFin ? formatINR(totals.received) : "—"} />
        <Stat tone="orange" label="Outstanding" value={showFin ? formatINR(totals.outstanding) : "—"} />
        <Stat
          tone="rose"
          label="Due now"
          value={showFin ? formatINR(totals.dueNow) : "—"}
          warn={showFin && money(totals.dueNow).gt(0)}
        />
        <Stat tone="teal" label="Future outstanding" value={showFin ? formatINR(totals.futureOutstanding) : "—"} />
        <Stat tone="blue" label="Collection" value={showFin ? `${totals.collectionPct}%` : "—"} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line pb-2 text-sm">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/projects/${id}?tab=${key}`}
            className={`rounded-md px-3 py-1 ${tab === key ? "bg-rust text-white" : "hover:bg-sand"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <Panel title="Project details">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">Type</dt>
              <dd className="capitalize">{project.propertyType}</dd>
              <dt className="text-muted">Status</dt>
              <dd className="capitalize">{project.status.replace("_", " ")}</dd>
              <dt className="text-muted">Location</dt>
              <dd>{project.location || "—"}</dd>
              <dt className="text-muted">Est. project cost</dt>
              <dd>
                {showFin
                  ? project.estimatedCost
                    ? formatINR(project.estimatedCost.toString())
                    : "—"
                  : "—"}
              </dd>
            </dl>
            {project.description ? <p className="mt-3 text-sm text-muted">{project.description}</p> : null}
          </Panel>
          {canStage && (
          <Panel title="Change current stage">
            <StageChange
              projectId={project.id}
              currentId={project.currentMilestoneId}
              milestones={project.milestones.map((m) => ({
                id: m.id,
                stageName: m.stageName,
                sequenceNumber: m.sequenceNumber,
              }))}
            />
          </Panel>
          )}
          <Panel title="Stage sequence">
            <ol className="space-y-1 text-sm">
              {project.milestones.map((m) => {
                const state =
                  m.sequenceNumber < currentSeq ? "Completed" : m.sequenceNumber === currentSeq ? "CURRENT" : "Upcoming";
                return (
                  <li key={m.id} className="flex justify-between">
                    <span>
                      {m.sequenceNumber}. {m.stageName}{" "}
                      {m.paymentPercentage ? `(${m.paymentPercentage.toString()}%)` : ""}
                    </span>
                    <span className={state === "CURRENT" ? "font-semibold text-due" : "text-muted"}>{state}</span>
                  </li>
                );
              })}
            </ol>
          </Panel>
          <Panel title="Stage history">
            {project.stageHistory.length === 0 ? (
              <p className="text-sm text-muted">No stage changes yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {project.stageHistory.map((h) => (
                  <li key={h.id}>
                    {h.changedAt.toLocaleDateString("en-IN")} · {h.previousStageName ?? "—"} → {h.newStageName} ·{" "}
                    {h.changedBy.name}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "customers" && (
        <div className="space-y-4">
        <Panel title="Customers in this project">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Customer</th>
                <th>Unit</th>
                <th>Type</th>
                <th className="text-right">Sale value</th>
                <th className="text-right">Received</th>
                <th className="text-right">Outstanding</th>
                <th className="text-right">Due now</th>
                <th className="text-right">Future</th>
                <th className="text-right">Paid %</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((row) => (
                <tr key={row.sale.id} className="border-t border-line">
                  <td className="py-2">
                    <Link className="text-rust" href={`/customers/${row.sale.customerId}`}>
                      {row.sale.customer.fullName}
                    </Link>
                  </td>
                  <td>{row.unit}</td>
                  <td className="capitalize">{row.sale.propertyType}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.saleValue) : "—"}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.received) : "—"}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.outstanding) : "—"}</td>
                  <td className="text-right text-due">{showFin ? formatINR(row.finance.dueNow) : "—"}</td>
                  <td className="text-right">{showFin ? formatINR(row.finance.futureOutstanding) : "—"}</td>
                  <td className="text-right">{showFin ? `${row.finance.collectionPct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        {cancelledSales.length > 0 && (
          <Panel title="Cancelled bookings">
            <p className="mb-3 text-sm text-muted">
              Cancelled after booking. Receipts (including advance) stay on the receipts tab.
            </p>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">Customer</th>
                  <th>Unit</th>
                  <th className="text-right">Sale value</th>
                  <th className="text-right">Advance kept</th>
                </tr>
              </thead>
              <tbody>
                {cancelledSales.map((row) => (
                  <tr key={row.sale.id} className="border-t border-line">
                    <td className="py-2">
                      <Link className="text-rust" href={`/customers/${row.sale.customerId}`}>
                        {row.sale.customer.fullName}
                      </Link>
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

      {tab === "stages" && (() => {
        const allocatedPct = sumStagePercentages(project.milestones);
        const remainingPct = money(100).minus(allocatedPct);
        const over = allocatedPct.gt(100);
        return (
        <Panel title="Payment stages">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              One list for this project. Percentages cannot exceed 100%. Saving updates the project default; tick apply to push to existing sales.
            </p>
            <p className={`text-sm font-medium ${over ? "text-due" : ""}`}>
              {allocatedPct.toFixed(2)}% used
              {over
                ? ` · over by ${allocatedPct.minus(100).toFixed(2)}%`
                : remainingPct.eq(0)
                  ? " · fully allocated"
                  : ` · ${remainingPct.toFixed(2)}% left`}
            </p>
          </div>
          {canScheduleEdit ? (
            <StageEditor
              salesCount={sales.length}
              milestones={project.milestones.map((m) => ({
                id: m.id,
                sequenceNumber: m.sequenceNumber,
                stageName: m.stageName,
                description: m.description,
                calculationType: m.calculationType,
                paymentPercentage: m.paymentPercentage?.toString() ?? "",
                fixedAmount: m.fixedAmount?.toString() ?? "",
                usedCount: project.sales.reduce(
                  (n, s) => n + s.milestones.filter((row) => row.projectMilestoneId === m.id).length,
                  0,
                ),
              }))}
            />
          ) : (
            <ol className="space-y-1 text-sm">
              {project.milestones.map((m) => (
                <li key={m.id}>
                  {m.sequenceNumber}. {m.stageName}{" "}
                  {m.paymentPercentage ? `(${m.paymentPercentage.toString()}%)` : m.fixedAmount ? `(₹${m.fixedAmount.toString()})` : ""}
                </li>
              ))}
            </ol>
          )}
          {access.keys.has("payment_schedule.create") && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-sm font-medium">Add stage</p>
              <ActionForm className="space-y-2" action={addProjectMilestone} submitLabel="Add stage">
                <input type="hidden" name="projectId" value={project.id} />
                <div className="grid gap-2 md:grid-cols-4">
                <input name="stageName" className={field} placeholder="Stage name" required />
                <select name="calculationType" className={field} defaultValue="percentage">
                  <option value="percentage">% of sale</option>
                  <option value="fixed_amount">Fixed ₹</option>
                </select>
                <input
                  name="paymentPercentage"
                  className={field}
                  placeholder={remainingPct.gt(0) ? `Max ${remainingPct.toFixed(2)}%` : "No % left"}
                />
                <input name="fixedAmount" className={field} placeholder="Fixed ₹ if needed" />
                </div>
              </ActionForm>
            </div>
          )}
        </Panel>
        );
      })()}

      {tab === "receipts" && (
        <Panel
          title="Receipts"
          action={
            canReceiptCreate ? (
            <Link className="text-sm text-rust" href="/receipts/new">
              Record receipt
            </Link>
            ) : undefined
          }
        >
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2 text-left">Number</th>
                <th>Customer</th>
                <th>Date</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {project.receipts.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2">{r.receiptNumber}</td>
                  <td>{r.customer.fullName}</td>
                  <td>{r.receiptDate.toLocaleDateString("en-IN")}</td>
                  <td className="text-right">{formatINR(r.amount.toString())}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "documents" && (
        <Panel title="Documents">
          {project.documents.length === 0 ? (
            <p className="text-sm text-muted">No documents on this project yet. Add from Documents.</p>
          ) : (
            <ul className="text-sm">
              {project.documents.map((d) => (
                <li key={d.id}>
                  {d.name} · {d.documentType}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "conversations" && (
        <Panel title="Conversations">
          <ul className="space-y-3 text-sm">
            {project.conversations.map((c) => (
              <li key={c.id} className="border-b border-line pb-2">
                <div className="flex justify-between">
                  <Link className="text-rust" href={`/customers/${c.customerId}`}>
                    {c.customer.fullName}
                  </Link>
                  {canConvCreate && <FollowUpForm customerId={c.customerId} projectId={project.id} />}
                </div>
                <div className="text-muted">
                  {c.occurredAt.toLocaleString("en-IN")} · {c.interactionType}
                </div>
                <p>{c.notes}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
