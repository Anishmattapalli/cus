import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { loadEffectiveAccess } from "@/lib/access";
import type { PermissionKey } from "@/lib/permission-catalog";

export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; permission: PermissionKey }[] = [
  { href: "/", label: "Dashboard", permission: "dashboard.view" },
  { href: "/projects", label: "Projects", permission: "projects.view" },
  { href: "/customers", label: "Customers", permission: "customers.view" },
  { href: "/sales", label: "Sales / Units", permission: "sales.view" },
  { href: "/receipts", label: "Receipts", permission: "receipts.view" },
  { href: "/payments-due", label: "Payments Due", permission: "payments_due.view" },
  { href: "/conversations", label: "Conversations", permission: "conversations.view" },
  { href: "/documents", label: "Documents", permission: "documents.view" },
  { href: "/settings", label: "Settings", permission: "settings.view" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const access = await loadEffectiveAccess(user.id);
  const nav = NAV.filter((item) => {
    if (item.href === "/settings") {
      return Boolean(
        access?.keys.has("settings.view") ||
          access?.keys.has("users.view") ||
          access?.keys.has("roles.view"),
      );
    }
    return Boolean(access?.keys.has(item.permission));
  });
  return <AppShell userName={user.name} nav={nav}>{children}</AppShell>;
}
