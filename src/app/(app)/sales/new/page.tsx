import { prisma } from "@/lib/prisma";
import { createSale } from "@/app/actions/records";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { requirePage } from "@/lib/access";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; projectId?: string }>;
}) {
  await requirePage("sales.create");
  const sp = await searchParams;
  const [customers, projects] = await Promise.all([
    prisma.customer.findMany({ orderBy: { fullName: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">New sale</h1>
      <p className="text-sm text-muted">
        The customer payment schedule is created automatically from the project stages. Due now includes every unpaid
        milestone up to the project current stage, minus receipts.
      </p>
      <ActionForm
        className="space-y-3"
        action={createSale}
        submitLabel="Create sale"
        successHref="/customers/$customerId?tab=schedule"
      >
        <label className="block text-sm">
          Customer
          <select name="customerId" className={`${field} mt-1`} defaultValue={sp.customerId || ""} required>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.customerCode})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Project
          <select name="projectId" className={`${field} mt-1`} defaultValue={sp.projectId || ""} required>
            <option value="">Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Property type
          <select name="propertyType" className={`${field} mt-1`} defaultValue="apartment">
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Unit / display number
            <input name="unitNumber" className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Flat
            <input name="flatNumber" className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Plot
            <input name="plotNumber" className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Villa
            <input name="villaNumber" className={`${field} mt-1`} />
          </label>
        </div>
        <label className="block text-sm">
          Final agreed sale value (₹)
          <input name="finalAgreedSaleValue" required className={`${field} mt-1`} placeholder="8000000" />
        </label>
        <label className="block text-sm">
          Booking date
          <input name="bookingDate" type="date" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          Notes
          <textarea name="notes" className={`${field} mt-1`} rows={2} />
        </label>
      </ActionForm>
    </div>
  );
}
