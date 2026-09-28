import { Decimal, money, roundMoney } from "./money";

export type ReceiptLike = {
  amount: Decimal.Value;
  receiptDate: Date;
  createdAt: Date;
  id: string;
  status: string;
};

export type MilestoneLike = {
  id: string;
  sequenceNumber: number;
  stageName: string;
  paymentPercentage: Decimal.Value | null;
  amountDue: Decimal.Value;
  becameDueAt: Date | null;
};

export type MilestoneRow = {
  id: string;
  sequenceNumber: number;
  stageName: string;
  paymentPercentage: string | null;
  amountDue: string;
  amountPaid: string;
  balance: string;
  status: "Paid" | "Part Paid" | "Due Now" | "Upcoming" | "Not Applicable";
  becameDueAt: Date | null;
};

export type SaleFinance = {
  saleValue: string;
  received: string;
  outstanding: string;
  dueNow: string;
  futureOutstanding: string;
  excessReceived: string;
  collectionPct: string;
  daysSinceDue: number | null;
  dueSince: Date | null;
  milestones: MilestoneRow[];
};

function sortReceipts(receipts: ReceiptLike[]): ReceiptLike[] {
  return [...receipts]
    .filter((r) => r.status === "active")
    .sort((a, b) => {
      const d = a.receiptDate.getTime() - b.receiptDate.getTime();
      if (d !== 0) return d;
      const c = a.createdAt.getTime() - b.createdAt.getTime();
      if (c !== 0) return c;
      return a.id.localeCompare(b.id);
    });
}

export function computeSaleFinance(
  saleValueInput: Decimal.Value,
  milestones: MilestoneLike[],
  receipts: ReceiptLike[],
  currentSequence: number | null,
): SaleFinance {
  const saleValue = roundMoney(saleValueInput);
  const orderedMilestones = [...milestones].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const remaining = orderedMilestones.map((m) => roundMoney(m.amountDue));
  const paid = orderedMilestones.map(() => money(0));

  let pool = money(0);
  for (const receipt of sortReceipts(receipts)) {
    pool = pool.plus(money(receipt.amount));
  }

  for (let i = 0; i < remaining.length; i++) {
    if (pool.lte(0)) break;
    const take = Decimal.min(remaining[i], pool);
    paid[i] = paid[i].plus(take);
    remaining[i] = remaining[i].minus(take);
    pool = pool.minus(take);
  }

  const received = roundMoney(
    sortReceipts(receipts).reduce((sum, r) => sum.plus(money(r.amount)), money(0)),
  );
  const outstanding = Decimal.max(saleValue.minus(received), money(0));
  const currentSeq = currentSequence ?? 0;

  const rows: MilestoneRow[] = orderedMilestones.map((m, i) => {
    const amountDue = roundMoney(m.amountDue);
    const amountPaid = roundMoney(paid[i]);
    const balance = roundMoney(remaining[i]);
    const payable = currentSeq > 0 && m.sequenceNumber <= currentSeq;
    let status: MilestoneRow["status"] = "Upcoming";
    if (amountDue.lte(0)) status = "Not Applicable";
    else if (balance.lte(0)) status = "Paid";
    else if (payable && amountPaid.gt(0)) status = "Part Paid";
    else if (payable) status = "Due Now";
    else if (amountPaid.gt(0) && balance.gt(0)) status = "Part Paid";
    else status = "Upcoming";
    return {
      id: m.id,
      sequenceNumber: m.sequenceNumber,
      stageName: m.stageName,
      paymentPercentage: m.paymentPercentage === null || m.paymentPercentage === undefined ? null : money(m.paymentPercentage).toFixed(2),
      amountDue: amountDue.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      balance: balance.toFixed(2),
      status,
      becameDueAt: m.becameDueAt,
    };
  });

  const dueNowRaw = rows
    .filter((r) => r.sequenceNumber <= currentSeq)
    .reduce((sum, r) => sum.plus(money(r.balance)), money(0));
  const dueNow = Decimal.max(roundMoney(dueNowRaw), money(0));
  const futureOutstanding = Decimal.max(outstanding.minus(dueNow), money(0));
  const excessReceived = Decimal.max(received.minus(saleValue), money(0));
  const collectionPct = saleValue.gt(0) ? received.div(saleValue).mul(100).toDecimalPlaces(2) : money(0);

  let dueSince: Date | null = null;
  for (const r of rows) {
    if (r.sequenceNumber <= currentSeq && money(r.balance).gt(0) && r.becameDueAt) {
      if (!dueSince || r.becameDueAt < dueSince) dueSince = r.becameDueAt;
    }
  }
  const daysSinceDue =
    dueSince && dueNow.gt(0)
      ? Math.max(0, Math.floor((Date.now() - dueSince.getTime()) / 86400000))
      : dueNow.gt(0)
        ? 0
        : null;

  return {
    saleValue: saleValue.toFixed(2),
    received: received.toFixed(2),
    outstanding: outstanding.toFixed(2),
    dueNow: dueNow.toFixed(2),
    futureOutstanding: futureOutstanding.toFixed(2),
    excessReceived: excessReceived.toFixed(2),
    collectionPct: collectionPct.toFixed(2),
    daysSinceDue,
    dueSince,
    milestones: rows,
  };
}

export function sumFinances(items: SaleFinance[]): SaleFinance {
  const z = money(0);
  const saleValue = items.reduce((s, i) => s.plus(money(i.saleValue)), z);
  const received = items.reduce((s, i) => s.plus(money(i.received)), z);
  const outstanding = items.reduce((s, i) => s.plus(money(i.outstanding)), z);
  const dueNow = items.reduce((s, i) => s.plus(money(i.dueNow)), z);
  const futureOutstanding = items.reduce((s, i) => s.plus(money(i.futureOutstanding)), z);
  const excessReceived = items.reduce((s, i) => s.plus(money(i.excessReceived)), z);
  const collectionPct = saleValue.gt(0) ? received.div(saleValue).mul(100).toDecimalPlaces(2) : money(0);
  return {
    saleValue: saleValue.toFixed(2),
    received: received.toFixed(2),
    outstanding: outstanding.toFixed(2),
    dueNow: dueNow.toFixed(2),
    futureOutstanding: futureOutstanding.toFixed(2),
    excessReceived: excessReceived.toFixed(2),
    collectionPct: collectionPct.toFixed(2),
    daysSinceDue: null,
    dueSince: null,
    milestones: [],
  };
}

export function sumStagePercentages(
  milestones: { calculationType: string; paymentPercentage: Decimal.Value | null; isActive?: boolean }[],
) {
  return milestones
    .filter((m) => m.calculationType === "percentage" && m.isActive !== false)
    .reduce((sum, m) => sum.plus(money(m.paymentPercentage ?? 0)), money(0));
}

export function validateStagePercentageCap(
  existingTotal: Decimal.Value,
  additionalPercentage: Decimal.Value,
): string | null {
  const extra = money(additionalPercentage);
  if (extra.lte(0)) return "Enter a payment percentage greater than 0.";
  if (extra.gt(100)) return "A single stage cannot be more than 100%.";
  const current = money(existingTotal);
  const next = current.plus(extra);
  if (next.gt(100)) {
    const remaining = Decimal.max(money(100).minus(current), money(0));
    return `Payment stages cannot exceed 100% in total. Already allocated: ${current.toFixed(2)}%. Remaining: ${remaining.toFixed(2)}%.`;
  }
  return null;
}

export function computeMilestoneAmounts(
  saleValue: Decimal.Value,
  milestones: { calculationType: string; paymentPercentage: Decimal.Value | null; fixedAmount: Decimal.Value | null }[],
): Decimal[] {
  const value = roundMoney(saleValue);
  const amounts = milestones.map((m) => {
    if (m.calculationType === "fixed_amount") return roundMoney(m.fixedAmount ?? 0);
    return roundMoney(value.mul(money(m.paymentPercentage ?? 0)).div(100));
  });
  const allPercentage = milestones.every((m) => m.calculationType === "percentage");
  const pctSum = milestones.reduce((s, m) => s.plus(money(m.paymentPercentage ?? 0)), money(0));
  if (allPercentage && pctSum.eq(100) && amounts.length > 0) {
    const sumExceptLast = amounts.slice(0, -1).reduce((s, a) => s.plus(a), money(0));
    amounts[amounts.length - 1] = roundMoney(value.minus(sumExceptLast));
  }
  return amounts;
}

export function amountBecomingDue(
  currentSequence: number | null,
  newSequence: number,
  finances: SaleFinance[],
): { customersAffected: number; newAmount: Decimal } {
  let newAmount = money(0);
  let customersAffected = 0;
  const from = currentSequence ?? 0;
  for (const f of finances) {
    let extra = money(0);
    for (const m of f.milestones) {
      if (m.sequenceNumber > from && m.sequenceNumber <= newSequence) {
        extra = extra.plus(money(m.balance));
      }
    }
    if (extra.gt(0)) {
      customersAffected += 1;
      newAmount = newAmount.plus(extra);
    }
  }
  return { customersAffected, newAmount: roundMoney(newAmount) };
}
