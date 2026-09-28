"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteProjectMilestone,
  moveProjectMilestone,
  updateProjectMilestone,
} from "@/app/actions/projects";
import { btn, btnGhost, field } from "./ui";

type Stage = {
  id: string;
  sequenceNumber: number;
  stageName: string;
  description: string | null;
  calculationType: string;
  paymentPercentage: string;
  fixedAmount: string;
  usedCount: number;
};

export function StageEditor({
  milestones,
  salesCount,
}: {
  milestones: Stage[];
  salesCount: number;
}) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted">No stages yet. Add the first one below.</p>;
  }

  return (
    <div className="divide-y divide-line rounded-lg border border-line">
      {milestones.map((m, i) => (
        <StageRow
          key={m.id}
          stage={m}
          isFirst={i === 0}
          isLast={i === milestones.length - 1}
          salesCount={salesCount}
        />
      ))}
    </div>
  );
}

function StageRow({
  stage,
  isFirst,
  isLast,
  salesCount,
}: {
  stage: Stage;
  isFirst: boolean;
  isLast: boolean;
  salesCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [calc, setCalc] = useState(stage.calculationType);

  function run(action: (fd: FormData) => Promise<{ error?: string; warn?: string | null; ok?: boolean }>, extra?: Record<string, string>) {
    setError(null);
    setWarn(null);
    start(async () => {
      const fd = new FormData();
      fd.set("milestoneId", stage.id);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      }
      const res = (await action(fd)) || {};
      if (res.error) setError(res.error);
      else {
        if (res.warn) setWarn(res.warn);
        router.refresh();
      }
    });
  }

  return (
    <form
      className="space-y-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setWarn(null);
        start(async () => {
          const res = (await updateProjectMilestone(fd)) || {};
          if (res.error) setError(res.error);
          else {
            if (res.warn) setWarn(res.warn);
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="milestoneId" value={stage.id} />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Stage {stage.sequenceNumber}</span>
        <span>{stage.usedCount > 0 ? `On ${stage.usedCount} sale(s)` : "Unused"}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-6">
        <input name="stageName" className={`${field} sm:col-span-2`} defaultValue={stage.stageName} required />
        <select
          name="calculationType"
          className={field}
          value={calc}
          onChange={(e) => setCalc(e.target.value)}
        >
          <option value="percentage">% of sale</option>
          <option value="fixed_amount">Fixed ₹</option>
        </select>
        <input
          name="paymentPercentage"
          className={field}
          defaultValue={stage.paymentPercentage}
          placeholder="%"
          disabled={calc !== "percentage"}
        />
        <input
          name="fixedAmount"
          className={field}
          defaultValue={stage.fixedAmount}
          placeholder="Fixed ₹"
          disabled={calc !== "fixed_amount"}
        />
        <input name="description" className={field} defaultValue={stage.description ?? ""} placeholder="Note" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {salesCount > 0 && (
          <label className="mr-auto flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="applyToSales" />
            Apply to existing sales
          </label>
        )}
        <button className={btn} disabled={pending} type="submit">
          Save
        </button>
        <button className={btnGhost} disabled={pending || isFirst} type="button" onClick={() => run(moveProjectMilestone, { direction: "up" })}>
          Up
        </button>
        <button className={btnGhost} disabled={pending || isLast} type="button" onClick={() => run(moveProjectMilestone, { direction: "down" })}>
          Down
        </button>
        <button
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 hover:bg-rose-100"
          disabled={pending}
          type="button"
          onClick={() => {
            if (confirm(`Delete stage “${stage.stageName}”? Only allowed if no customer schedule uses it.`)) {
              run(deleteProjectMilestone);
            }
          }}
        >
          Delete
        </button>
      </div>
      {error && <p className="text-sm text-due">{error}</p>}
      {warn && <p className="text-sm text-due">{warn}</p>}
    </form>
  );
}
