import { prisma } from "./prisma";
import { computeMilestoneAmounts } from "./finance";
import { money } from "./money";

export async function nextCode(name: string, prefix: string, pad = 4) {
  const row = await prisma.sequenceCounter.upsert({
    where: { name },
    update: { value: { increment: 1 } },
    create: { name, value: 1 },
  });
  return `${prefix}-${String(row.value).padStart(pad, "0")}`;
}

export function unitLabel(sale: {
  unitNumber?: string | null;
  flatNumber?: string | null;
  plotNumber?: string | null;
  villaNumber?: string | null;
}) {
  return sale.unitNumber || sale.flatNumber || sale.plotNumber || sale.villaNumber || "—";
}

export async function createSaleSchedule(opts: {
  saleId: string;
  projectId: string;
  saleValue: string | number;
  bookingDate?: Date | null;
}) {
  const project = await prisma.project.findUnique({
    where: { id: opts.projectId },
    include: { milestones: { where: { isActive: true }, orderBy: { sequenceNumber: "asc" } } },
  });
  if (!project) throw new Error("Project not found");
  const current = project.milestones.find((m) => m.id === project.currentMilestoneId);
  const currentSeq = current?.sequenceNumber ?? 0;
  const amounts = computeMilestoneAmounts(
    opts.saleValue,
    project.milestones.map((m) => ({
      calculationType: m.calculationType,
      paymentPercentage: m.paymentPercentage,
      fixedAmount: m.fixedAmount,
    })),
  );
  const now = new Date();
  await prisma.salePaymentMilestone.createMany({
    data: project.milestones.map((m, i) => ({
      saleId: opts.saleId,
      projectMilestoneId: m.id,
      sequenceNumber: m.sequenceNumber,
      stageName: m.stageName,
      description: m.description,
      calculationType: m.calculationType,
      paymentPercentage: m.paymentPercentage,
      amountDue: amounts[i],
      becameDueAt: m.sequenceNumber <= currentSeq ? opts.bookingDate || now : null,
    })),
  });
}

export async function syncUncustomizedSaleSchedules(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { milestones: { where: { isActive: true }, orderBy: { sequenceNumber: "asc" } } },
  });
  if (!project) return 0;
  const sales = await prisma.sale.findMany({
    where: { projectId, saleStatus: { not: "cancelled" }, scheduleIsCustomized: false },
    include: { milestones: true },
  });
  let updated = 0;
  for (const sale of sales) {
    const amounts = computeMilestoneAmounts(
      sale.finalAgreedSaleValue,
      project.milestones.map((m) => ({
        calculationType: m.calculationType,
        paymentPercentage: m.paymentPercentage,
        fixedAmount: m.fixedAmount,
      })),
    );
    for (const [i, m] of project.milestones.entries()) {
      const row = sale.milestones.find((r) => r.projectMilestoneId === m.id);
      if (!row) continue;
      await prisma.salePaymentMilestone.update({
        where: { id: row.id },
        data: {
          sequenceNumber: m.sequenceNumber,
          stageName: m.stageName,
          description: m.description,
          calculationType: m.calculationType,
          paymentPercentage: m.paymentPercentage,
          amountDue: amounts[i],
        },
      });
    }
    updated += 1;
  }
  return updated;
}

export function parseRupees(input: string): string {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!cleaned) return "0";
  money(cleaned);
  return cleaned;
}

export async function recalculateSaleMilestoneAmounts(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { milestones: { orderBy: { sequenceNumber: "asc" } } },
  });
  if (!sale) return;
  const amounts = computeMilestoneAmounts(
    sale.finalAgreedSaleValue,
    sale.milestones.map((m) => ({
      calculationType: m.calculationType,
      paymentPercentage: m.paymentPercentage,
      fixedAmount: m.calculationType === "fixed_amount" ? m.amountDue : null,
    })),
  );
  for (const [i, m] of sale.milestones.entries()) {
    await prisma.salePaymentMilestone.update({
      where: { id: m.id },
      data: { amountDue: amounts[i] },
    });
  }
}
