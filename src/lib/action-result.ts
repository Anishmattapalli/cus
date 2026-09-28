export function readActionResult(res: unknown): {
  error?: string;
  warn?: string | null;
  id?: string;
  customerId?: string;
} {
  if (!res || typeof res !== "object") return {};
  const r = res as Record<string, unknown>;
  return {
    error: typeof r.error === "string" ? r.error : undefined,
    warn: typeof r.warn === "string" ? r.warn : r.warn === null ? null : undefined,
    id: typeof r.id === "string" ? r.id : undefined,
    customerId: typeof r.customerId === "string" ? r.customerId : undefined,
  };
}
