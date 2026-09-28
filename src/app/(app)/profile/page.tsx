import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateOwnProfile } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const full = await prisma.user.findUnique({ where: { id: user.id }, include: { role: true } });
  if (!full) redirect("/login");
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">My profile</h1>
      <p className="text-sm text-muted">
        {full.email} · {full.role?.name ?? "No role"}
      </p>
      <ActionForm className="space-y-3" action={updateOwnProfile} submitLabel="Save profile">
        <label className="block text-sm">
          Full name
          <input name="name" className={`${field} mt-1`} defaultValue={full.name} required />
        </label>
        <label className="block text-sm">
          Mobile
          <input name="mobile" className={`${field} mt-1`} defaultValue={full.mobile ?? ""} />
        </label>
        <label className="block text-sm">
          Designation
          <input name="designation" className={`${field} mt-1`} defaultValue={full.designation ?? ""} />
        </label>
      </ActionForm>
    </div>
  );
}
