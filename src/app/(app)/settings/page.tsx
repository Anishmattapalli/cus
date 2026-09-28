import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadEffectiveAccess } from "@/lib/access";
import { Panel } from "@/components/ui";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const access = await loadEffectiveAccess(user.id);
  const canUsers = Boolean(access?.keys.has("users.view"));
  const canRoles = Boolean(access?.keys.has("roles.view"));
  const canSettings = Boolean(access?.keys.has("settings.view"));
  const canAudit = Boolean(access?.keys.has("permissions.manage"));
  if (!canUsers && !canRoles && !canSettings) redirect("/forbidden");
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {(canUsers || canRoles || canAudit) && (
        <Panel title="Users & access">
          <div className="flex flex-col gap-2 text-sm">
            {canUsers && (
              <Link className="text-rust" href="/settings/users">
                Users & access
              </Link>
            )}
            {canRoles && (
              <Link className="text-rust" href="/settings/roles">
                Roles & permissions
              </Link>
            )}
            {canAudit && (
              <Link className="text-rust" href="/settings/audit">
                Access audit log
              </Link>
            )}
          </div>
        </Panel>
      )}
      <Panel title="Standalone">
        <p className="text-sm">This application does not connect to accounting software, banks, WhatsApp, or email.</p>
      </Panel>
    </div>
  );
}
