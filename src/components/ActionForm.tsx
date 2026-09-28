"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { btn, btnDanger } from "./ui";

type Result = { error?: string; id?: string; customerId?: string; ok?: boolean; warn?: string | null };

export function ActionForm({
  action,
  successHref,
  submitLabel,
  children,
  className,
  confirmMessage,
  confirmField,
  confirmInitial,
  variant = "primary",
}: {
  action: (formData: FormData) => Promise<Result | void>;
  successHref?: string;
  submitLabel: string;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  confirmField?: string;
  confirmInitial?: string;
  variant?: "primary" | "danger";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const needsConfirm =
          Boolean(confirmMessage) &&
          (!confirmField || String(fd.get(confirmField) || "") !== (confirmInitial ?? ""));
        if (needsConfirm && !window.confirm(confirmMessage)) {
          return;
        }
        setPending(true);
        setError(null);
        setWarn(null);
        try {
          const res = (await action(fd)) || {};
          if (res.error) {
            setError(res.error);
            return;
          }
          if (res.warn) setWarn(res.warn);
          if (successHref) {
            const href = successHref
              .replaceAll("$id", res.id || "")
              .replaceAll("$customerId", res.customerId || res.id || "");
            router.push(href);
          } else {
            router.refresh();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
      {error && <p className="text-sm text-due">{error}</p>}
      {warn && <p className="text-sm text-due">{warn}</p>}
      <button className={variant === "danger" ? btnDanger : btn} disabled={pending} type="submit">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
