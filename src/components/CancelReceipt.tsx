"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelReceipt } from "@/app/actions/records";
import { btnGhost } from "./ui";

export function CancelReceipt({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button className="text-xs text-due hover:underline" type="button" onClick={() => setOpen(true)}>
        Cancel receipt
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded border border-due/30 bg-amber-50 p-2">
      <p className="text-xs">Receipts are not deleted. Confirm cancellation to exclude this amount from totals.</p>
      <input
        className="w-full rounded border border-line px-2 py-1 text-sm"
        placeholder="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <button className={btnGhost} type="button" onClick={() => setOpen(false)}>
          Keep
        </button>
        <button
          className="rounded-md bg-due px-3 py-1 text-sm text-white"
          disabled={pending}
          type="button"
          onClick={() =>
            start(async () => {
              await cancelReceipt(id, reason || "Cancelled");
              setOpen(false);
              router.refresh();
            })
          }
        >
          Confirm cancel
        </button>
      </div>
    </div>
  );
}
