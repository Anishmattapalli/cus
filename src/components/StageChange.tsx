"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmStageChange, previewStageChange } from "@/app/actions/projects";
import { formatINR } from "@/lib/money";
import { btn, btnGhost, field } from "./ui";

export function StageChange({
  projectId,
  milestones,
  currentId,
}: {
  projectId: string;
  currentId: string | null;
  milestones: { id: string; stageName: string; sequenceNumber: number }[];
}) {
  const [nextId, setNextId] = useState(currentId ?? "");
  const [preview, setPreview] = useState<{
    currentStage: string;
    newStage: string;
    customersAffected: number;
    newAmountBecomingDue: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function runPreview() {
    setError(null);
    start(async () => {
      const res = await previewStageChange(projectId, nextId);
      if (res && "error" in res && res.error) setError(res.error);
      else setPreview(res as never);
    });
  }

  function confirm() {
    start(async () => {
      const res = await confirmStageChange(projectId, nextId);
      if (res && "error" in res && res.error) setError(res.error);
      else {
        setPreview(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Set current stage</span>
          <select className={field} value={nextId} onChange={(e) => setNextId(e.target.value)}>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.sequenceNumber}. {m.stageName}
              </option>
            ))}
          </select>
        </label>
        <button className={btn} disabled={pending || !nextId || nextId === currentId} onClick={runPreview}>
          Change stage…
        </button>
      </div>
      {error && <p className="text-sm text-due">{error}</p>}
      {preview && (
        <div className="rounded-md border border-due/40 bg-amber-50 p-4 text-sm">
          <p>
            Current stage: <strong>{preview.currentStage}</strong>
          </p>
          <p>
            New stage: <strong>{preview.newStage}</strong>
          </p>
          <p className="mt-2">
            Changing the project stage will make {formatINR(preview.newAmountBecomingDue)} payable
            across {preview.customersAffected} customers.
          </p>
          <p className="mt-1 text-muted">This does not create a receipt. It only makes scheduled amounts due.</p>
          <div className="mt-3 flex gap-2">
            <button className={btnGhost} onClick={() => setPreview(null)}>
              Cancel
            </button>
            <button className={btn} disabled={pending} onClick={confirm}>
              Confirm stage change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
