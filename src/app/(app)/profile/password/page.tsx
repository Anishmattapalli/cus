import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { changeOwnPassword } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";

export default async function PasswordPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Change password</h1>
      <ActionForm className="space-y-3" action={changeOwnPassword} submitLabel="Update password">
        <label className="block text-sm">
          Current password
          <input name="currentPassword" type="password" required className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          New password
          <input name="newPassword" type="password" required minLength={8} className={`${field} mt-1`} />
        </label>
      </ActionForm>
    </div>
  );
}
