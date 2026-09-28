export function Stat({
  label,
  value,
  warn,
  tone = "slate",
}: {
  label: string;
  value: string;
  warn?: boolean;
  tone?: "slate" | "indigo" | "teal" | "amber" | "green" | "orange" | "rose" | "blue";
}) {
  const tones = {
    slate: "from-slate-500/15 to-white text-slate-700",
    indigo: "from-indigo-500/15 to-white text-indigo-700",
    teal: "from-teal-500/15 to-white text-teal-800",
    amber: "from-amber-500/18 to-white text-amber-800",
    green: "from-emerald-500/15 to-white text-emerald-800",
    orange: "from-orange-500/18 to-white text-orange-800",
    rose: "from-rose-500/18 to-white text-rose-800",
    blue: "from-sky-500/15 to-white text-sky-800",
  };
  const bars = {
    slate: "bg-slate-500",
    indigo: "bg-indigo-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    rose: "bg-rose-500",
    blue: "bg-sky-500",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-gradient-to-br p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${tones[tone]} ${
        warn ? "ring-1 ring-due/40" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${bars[tone]}`} />
      <div className="pl-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 pl-2 text-xl font-semibold tabular-nums ${warn ? "text-due" : "text-ink"}`}>{value}</div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm transition duration-200 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-line bg-sand/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition duration-150 focus:border-rust focus:ring-2 focus:ring-rust/20";
export const btn =
  "inline-flex items-center rounded-lg bg-rust px-3.5 py-2 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-rust/90 hover:shadow active:scale-[0.98]";
export const btnGhost =
  "inline-flex items-center rounded-lg border border-line bg-white px-3.5 py-2 text-sm transition duration-150 hover:bg-sand hover:border-rust/30 active:scale-[0.98]";
export const btnDanger =
  "inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-800 transition duration-150 hover:bg-rose-100 active:scale-[0.98]";
