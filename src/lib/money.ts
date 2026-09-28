import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function money(value: Decimal.Value | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(value.toString());
}

export function roundMoney(value: Decimal.Value): Decimal {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function formatINR(value: Decimal.Value | null | undefined): string {
  const n = money(value);
  const negative = n.isNegative();
  const abs = n.abs().toFixed(2);
  const [whole, fraction] = abs.split(".");
  const formattedWhole = formatIndianWhole(whole);
  const out = `₹${formattedWhole}.${fraction}`;
  return negative ? `-${out}` : out;
}

function formatIndianWhole(whole: string): string {
  if (whole.length <= 3) return whole;
  const last3 = whole.slice(-3);
  let rest = whole.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(",")},${last3}`;
}

export function formatCompactINR(value: Decimal.Value): string {
  const n = money(value);
  const abs = n.abs();
  if (abs.gte(10000000)) {
    const cr = abs.div(10000000);
    const s = cr.toDecimalPlaces(cr.lt(10) ? 2 : 1).toString();
    return `${n.isNegative() ? "-" : ""}₹${s} Cr`;
  }
  if (abs.gte(100000)) {
    const l = abs.div(100000);
    const s = l.toDecimalPlaces(l.lt(10) ? 2 : 1).toString();
    return `${n.isNegative() ? "-" : ""}₹${s} L`;
  }
  return formatINR(n);
}
