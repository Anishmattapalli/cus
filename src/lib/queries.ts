import { prisma } from "./prisma";
import { computeSaleFinance, sumFinances, type SaleFinance } from "./finance";
import { unitLabel } from "./ops";

const saleInclude = {
  customer: true,
  project: { include: { currentMilestone: true, milestones: true } },
  milestones: { orderBy: { sequenceNumber: "asc" as const } },
  receipts: { orderBy: [{ receiptDate: "asc" as const }, { createdAt: "asc" as const }] },
};

export type SaleWithFinance = Awaited<ReturnType<typeof loadSaleFinance>>;

export function currentSequence(project: {
  currentMilestoneId: string | null;
  milestones: { id: string; sequenceNumber: number }[];
  currentMilestone?: { sequenceNumber: number } | null;
}) {
  if (project.currentMilestone) return project.currentMilestone.sequenceNumber;
  const m = project.milestones.find((x) => x.id === project.currentMilestoneId);
  return m?.sequenceNumber ?? null;
}

export function financeForSale(sale: {
  finalAgreedSaleValue: { toString(): string };
  milestones: {
    id: string;
    sequenceNumber: number;
    stageName: string;
    paymentPercentage: { toString(): string } | null;
    amountDue: { toString(): string };
    becameDueAt: Date | null;
  }[];
  receipts: {
    amount: { toString(): string };
    receiptDate: Date;
    createdAt: Date;
    id: string;
    status: string;
  }[];
  project: {
    currentMilestoneId: string | null;
    milestones: { id: string; sequenceNumber: number }[];
    currentMilestone?: { sequenceNumber: number } | null;
  };
}): SaleFinance {
  return computeSaleFinance(
    sale.finalAgreedSaleValue.toString(),
    sale.milestones.map((m) => ({
      id: m.id,
      sequenceNumber: m.sequenceNumber,
      stageName: m.stageName,
      paymentPercentage: m.paymentPercentage?.toString() ?? null,
      amountDue: m.amountDue.toString(),
      becameDueAt: m.becameDueAt,
    })),
    sale.receipts.map((r) => ({
      amount: r.amount.toString(),
      receiptDate: r.receiptDate,
      createdAt: r.createdAt,
      id: r.id,
      status: r.status,
    })),
    currentSequence(sale.project),
  );
}

export async function loadSaleFinance(saleId: string) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: saleInclude });
  if (!sale) return null;
  return { sale, finance: financeForSale(sale) };
}

export async function loadAllActiveSales() {
  return prisma.sale.findMany({
    where: { saleStatus: { not: "cancelled" } },
    include: saleInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function decorateSales<T extends Parameters<typeof financeForSale>[0]>(sales: T[]) {
  return sales.map((sale) => ({
    sale,
    finance: financeForSale(sale),
    unit: unitLabel(sale as never),
  }));
}

export { saleInclude, sumFinances };
