import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decorateSales, loadAllActiveSales, sumFinances } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { Panel, Stat } from "@/components/ui";
import { FollowUpForm } from "@/components/FollowUpForm";
import { money } from "@/lib/money";
import { requirePage } from "@/lib/access";

export default async function DashboardPage() {
  const { access } = await requirePage("dashboard.view");
  const showFinancials = access.keys.has("customers.view_financials") || access.keys.has("sales.view_financials");
  const showDue = access.keys.has("payments_due.view");
  const showReceipts = access.keys.has("receipts.view");
  const [salesRaw, receipts, conversations, projects] = await Promise.all([
    loadAllActiveSales(),
    prisma.receipt.findMany({
      where: { status: "active" },
      include: { customer: true, sale: true, project: true },
      orderBy: { receiptDate: "desc" },
      take: 8,
    }),
    prisma.conversation.findMany({
      include: { customer: true },
      orderBy: { occurredAt: "desc" },
      take: 8,
    }),
    prisma.project.findMany({ include: { currentMilestone: true } }),
  ]);

  const sales = decorateSales(salesRaw);
  const totals = sumFinances(sales.map((s) => s.finance));
  const dueRows = sales
    .filter((s) => money(s.finance.dueNow).gt(0))
    .sort((a, b) => money(b.finance.dueNow).cmp(money(a.finance.dueNow)));

  const followUps = conversations.filter((c) => c.followUpRequired && !c.followUpCompletedAt && c.followUpAt);

  const customerCount = await prisma.customer.count();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Who needs to be called today about payments?</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat tone="slate" label="Projects" value={String(projects.length)} />
        <Stat tone="indigo" label="Customers" value={String(customerCount)} />
        <Stat tone="teal" label="Properties sold" value={String(sales.length)} />
        <Stat tone="amber" label="Total sale value" value={showFinancials ? formatINR(totals.saleValue) : "—"} />
        <Stat tone="green" label="Total received" value={showFinancials ? formatINR(totals.received) : "—"} />
        <Stat tone="orange" label="Total outstanding" value={showFinancials ? formatINR(totals.outstanding) : "—"} />
        <Stat
          tone="rose"
          label="Due now"
          value={showDue ? formatINR(totals.dueNow) : "—"}
          warn={showDue && money(totals.dueNow).gt(0)}
        />
        <Stat tone="blue" label="Collection" value={showFinancials ? `${totals.collectionPct}%` : "—"} />
      </div>

      {showDue && (
      <Panel
        title="Payments due now"
        action={
          <Link href="/payments-due" className="text-sm text-rust">
            Open full list
          </Link>
        }
      >
        {dueRows.length === 0 ? (
          <p className="text-sm text-muted">No amounts currently due.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Customer</th>
                <th>Project</th>
                <th>Unit</th>
                <th>Current stage</th>
                <th className="text-right">Due now</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dueRows.slice(0, 12).map((row) => (
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
                  <td className="py-2">
                    {access.keys.has("conversations.create") && (
                    <FollowUpForm
                      customerId={row.sale.customerId}
                      saleId={row.sale.id}
                      projectId={row.sale.projectId}
                      defaultSubject={`Payment due now ${formatINR(row.finance.dueNow)} — ${row.sale.project.currentMilestone?.stageName ?? ""}`}
                    />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {showReceipts && (
        <Panel title="Recent receipts">
          <ul className="space-y-2 text-sm">
            {receipts.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-line pb-2">
                <span>
                  {r.receiptNumber} · {r.customer.fullName}
                </span>
                <span className="tabular-nums">{formatINR(r.amount.toString())}</span>
              </li>
            ))}
          </ul>
        </Panel>
        )}
        <Panel title="Recent conversations">
          <ul className="space-y-2 text-sm">
            {conversations.map((c) => (
              <li key={c.id} className="border-b border-line pb-2">
                <Link className="text-rust" href={`/customers/${c.customerId}`}>
                  {c.customer.fullName}
                </Link>
                <span className="text-muted"> · {c.interactionType.replace("_", " ")}</span>
                <div className="text-muted">{c.notes}</div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Upcoming follow-ups">
          {followUps.length === 0 ? (
            <p className="text-sm text-muted">No scheduled follow-ups.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {followUps.map((c) => (
                <li key={c.id}>
                  {c.followUpAt?.toLocaleString("en-IN")} · {c.customer.fullName}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Projects and current stage">
          <ul className="space-y-2 text-sm">
            {projects.map((p) => (
              <li key={p.id} className="flex justify-between">
                <Link className="text-rust" href={`/projects/${p.id}`}>
                  {p.name}
                </Link>
                <span>{p.currentMilestone?.stageName ?? "No stage"}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
