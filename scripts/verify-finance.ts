import { computeSaleFinance, computeMilestoneAmounts, validateStagePercentageCap } from "../src/lib/finance";
import { money } from "../src/lib/money";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const stages = [
  ["Booking", "10"],
  ["Foundation", "10"],
  ["First Slab", "10"],
  ["Second Slab", "10"],
  ["Brick Work", "10"],
  ["Tiles", "10"],
  ["Finishing", "10"],
  ["Handover", "10"],
  ["Registration", "20"],
].map(([stageName, pct], i) => ({
  id: String(i + 1),
  sequenceNumber: i + 1,
  stageName,
  paymentPercentage: pct,
  amountDue: "0",
  becameDueAt: new Date("2026-08-15"),
}));

const amounts = computeMilestoneAmounts(
  "8000000",
  stages.map((s) => ({ calculationType: "percentage", paymentPercentage: s.paymentPercentage, fixedAmount: null })),
);
const miles = stages.map((s, i) => ({ ...s, amountDue: amounts[i].toFixed(2) }));

function rec(id: string, amount: string) {
  return { id, amount, receiptDate: new Date("2026-09-01"), createdAt: new Date("2026-09-01"), status: "active" };
}

let f = computeSaleFinance("8000000", miles, [], 1);
assert(money(f.dueNow).eq(800000), `S1 due now ${f.dueNow}`);

f = computeSaleFinance("8000000", miles, [], 2);
assert(money(f.dueNow).eq(1600000), `S2 due now ${f.dueNow}`);

f = computeSaleFinance("8000000", miles, [rec("a", "1600000")], 2);
assert(money(f.dueNow).eq(0), `S3 due now ${f.dueNow}`);

f = computeSaleFinance("8000000", miles, [rec("a", "1000000")], 2);
assert(money(f.dueNow).eq(600000), `S4 due now ${f.dueNow}`);

f = computeSaleFinance("8000000", miles, [rec("a", "1000000")], 3);
assert(money(f.dueNow).eq(1400000), `S5 due now ${f.dueNow}`);

f = computeSaleFinance("8000000", miles, [rec("a", "3000000")], 3);
assert(money(f.dueNow).eq(0), `S6 due now ${f.dueNow}`);
assert(money(f.futureOutstanding).eq(5000000), `S6 future ${f.futureOutstanding}`);

f = computeSaleFinance("8000000", miles, [rec("a", "8000000")], 9);
assert(money(f.outstanding).eq(0) && money(f.dueNow).eq(0) && money(f.futureOutstanding).eq(0), "S7 fully paid");

f = computeSaleFinance("8000000", miles, [rec("a", "2400000")], 3);
assert(money(f.dueNow).eq(0), `Ravi at first slab ${f.dueNow}`);
f = computeSaleFinance("8000000", miles, [rec("a", "2400000")], 4);
assert(money(f.dueNow).eq(800000), `Ravi at second slab ${f.dueNow}`);
assert(money(f.outstanding).eq(5600000), `outstanding ${f.outstanding}`);
assert(money(f.futureOutstanding).eq(4800000), `future ${f.futureOutstanding}`);

console.log("Finance scenarios 1–7 and Ravi example passed.");

assert(validateStagePercentageCap(90, 10) === null, "90+10 should be allowed");
assert(validateStagePercentageCap(90, 10.01) !== null, "90+10.01 should be rejected");
assert(validateStagePercentageCap(100, 1) !== null, "100+1 should be rejected");
assert(validateStagePercentageCap(0, 0) !== null, "0% stage should be rejected");
console.log("Percentage cap checks passed.");
