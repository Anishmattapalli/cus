import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="text-sm text-muted">You do not have permission to view this page.</p>
      <Link className="text-sm font-medium text-rust hover:underline" href="/">
        Back to dashboard
      </Link>
    </div>
  );
}
