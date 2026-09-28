"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addSaleMilestone,
  deleteSaleMilestone,
  moveSaleMilestone,
  updateSaleMilestone,
} from "@/app/actions/records";
import { ActionForm } from "./ActionForm";
import { btn, btnGhost, field } from "./ui";

type Stage = {
  id: string;
  sequenceNumber: number;
  stageName: string;
  description: string | null;
  calculationType: string;
  paymentPercentage: string;
  amountDue: string;
  amountPaid: string;
};

export function SaleStageEditor({
  saleId,
  remainingPct,
  milestones,
}: {
  saleId: string;
  remainingPct: string;
  milestones: Stage[];
}) {
  return (
    <div className="space-y-4">
      {milestones.map((m, i) => (
        <SaleStageRow key={m.id} stage={m} isFirst={i === 0} isLast={i === milestones.length - 1} />
      ))}
      <ActionForm className="space-y-2 rounded-md border border-dashed border-line p-3" action={addSaleMilestone} submitLabel="Add stage">
        <p className="text-sm font-medium">Add stage to this customer schedule</p>
        <input type="hidden" name="saleId" value={saleId} />
        <input name="stageName" className={field} placeholder="Stage name" required />
        <select name="calculationType" className={field} defaultValue="percentage">
          <option value="percentage">Percentage of sale value</option>
          <option value="fixed_amount">Fixed amount</option>
        </select>
        <input name="paymentPercentage" className={field} placeholder={`Percentage (max ${remainingPct})`} />
        <input name="fixedAmount" className={field} placeholder="Fixed amount if applicable" />
      </ActionForm>
    </div>
  );
}

function SaleStageRow({
  stage,
  isFirst,
  isLast,
}: {
  stage: Stage;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [calc, setCalc] = useState(stage.calculationType);

  function run(action: (fd: FormData) => Promise<{ error?: string; warn?: string | null }>, extra?: Record<string, string>) {
    setError(null);
    setWarn(null);
    start(async () => {
      const fd = new FormData();
      fd.set("milestoneId", stage.id);
      if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
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
      className="space-y-2 rounded-md border border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setWarn(null);
        start(async () => {
          const res = (await updateSaleMilestone(fd)) || {};
          if (res.error) setError(res.error);
          else {
            if (res.warn) setWarn(res.warn);
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="milestoneId" value={stage.id} />
      <div className="flex justify-between text-xs text-muted">
        <span>Stage {stage.sequenceNumber}</span>
        <span>Paid {stage.amountPaid}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="stageName" className={field} defaultValue={stage.stageName} required />
        <select name="calculationType" className={field} value={calc} onChange={(e) => setCalc(e.target.value)}>
          <option value="percentage">Percentage of sale value</option>
          <option value="fixed_amount">Fixed amount</option>
        </select>
        <input
          name="paymentPercentage"
          className={field}
          defaultValue={stage.paymentPercentage}
          disabled={calc !== "percentage"}
        />
        <input
          name="fixedAmount"
          className={field}
          defaultValue={stage.amountDue}
          disabled={calc !== "fixed_amount"}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={pending} type="submit">
          Save stage
        </button>
        <button className={btnGhost} disabled={pending || isFirst} type="button" onClick={() => run(moveSaleMilestone, { direction: "up" })}>
          Move up
        </button>
        <button className={btnGhost} disabled={pending || isLast} type="button" onClick={() => run(moveSaleMilestone, { direction: "down" })}>
          Move down
        </button>
        <button
          className="rounded-md border border-due/40 px-3 py-2 text-sm text-due"
          disabled={pending}
          type="button"
          onClick={() => {
            if (confirm(`Delete stage “${stage.stageName}” from this customer schedule?`)) run(deleteSaleMilestone);
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
