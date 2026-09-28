import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePage("dashboard.view");
  const { q = "" } = await searchParams;
  const query = q.trim();
  if (!query) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-sm text-muted">Enter a customer, mobile, email, unit, sale ID, receipt or UTR.</p>
      </div>
    );
  }

  const [customers, projects, sales, receipts] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { primaryMobile: { contains: query } },
          { email: { contains: query } },
          { customerCode: { contains: query } },
        ],
      },
      take: 20,
    }),
    prisma.project.findMany({
      where: { OR: [{ name: { contains: query } }, { code: { contains: query } }] },
      take: 20,
    }),
    prisma.sale.findMany({
      where: {
        OR: [
          { saleCode: { contains: query } },
          { unitNumber: { contains: query } },
          { flatNumber: { contains: query } },
          { plotNumber: { contains: query } },
          { villaNumber: { contains: query } },
        ],
      },
      include: { customer: true, project: true },
      take: 20,
    }),
    prisma.receipt.findMany({
      where: {
        OR: [{ receiptNumber: { contains: query } }, { utrOrTransactionNumber: { contains: query } }],
      },
      include: { customer: true },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search results for “{query}”</h1>
      <section>
        <h2 className="text-sm font-semibold">Customers</h2>
        <ul className="text-sm">
          {customers.map((c) => (
            <li key={c.id}>
              <Link className="text-rust" href={`/customers/${c.id}`}>
                {c.fullName}
              </Link>{" "}
              · {c.primaryMobile}
            </li>
          ))}
          {customers.length === 0 && <li className="text-muted">None</li>}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Projects</h2>
        <ul className="text-sm">
          {projects.map((p) => (
            <li key={p.id}>
              <Link className="text-rust" href={`/projects/${p.id}`}>
                {p.name}
              </Link>
            </li>
          ))}
          {projects.length === 0 && <li className="text-muted">None</li>}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Sales / units</h2>
        <ul className="text-sm">
          {sales.map((s) => (
            <li key={s.id}>
              {s.saleCode} · {s.project.name} · {s.unitNumber || s.flatNumber || s.plotNumber} ·{" "}
              <Link className="text-rust" href={`/customers/${s.customerId}`}>
                {s.customer.fullName}
              </Link>
            </li>
          ))}
          {sales.length === 0 && <li className="text-muted">None</li>}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Receipts</h2>
        <ul className="text-sm">
          {receipts.map((r) => (
            <li key={r.id}>
              {r.receiptNumber} · {r.customer.fullName} · {r.utrOrTransactionNumber}
            </li>
          ))}
          {receipts.length === 0 && <li className="text-muted">None</li>}
        </ul>
      </section>
    </div>
  );
}
