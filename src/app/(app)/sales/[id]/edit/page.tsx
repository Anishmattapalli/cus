import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateSale } from "@/app/actions/records";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { requirePage } from "@/lib/access";

function dateValue(value?: Date | null) {
  if (!value) return "";
  return value.toLocaleDateString("en-CA");
}

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("sales.edit");
  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { customer: true, project: true },
  });
  if (!sale) notFound();

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <Link href={`/customers/${sale.customerId}?tab=purchases`} className="text-sm text-rust">
          ← Back to {sale.customer.fullName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit sale</h1>
        <p className="text-sm text-muted">
          {sale.saleCode} · {sale.project.name}
        </p>
      </div>
      <ActionForm
        className="space-y-3"
        action={updateSale}
        submitLabel="Save sale"
        successHref={`/customers/${sale.customerId}?tab=purchases`}
      >
        <input type="hidden" name="saleId" value={sale.id} />
        <label className="block text-sm">
          Property type
          <select name="propertyType" className={`${field} mt-1`} defaultValue={sale.propertyType}>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Unit / display number
            <input name="unitNumber" className={`${field} mt-1`} defaultValue={sale.unitNumber ?? ""} />
          </label>
          <label className="block text-sm">
            Flat
            <input name="flatNumber" className={`${field} mt-1`} defaultValue={sale.flatNumber ?? ""} />
          </label>
          <label className="block text-sm">
            Plot
            <input name="plotNumber" className={`${field} mt-1`} defaultValue={sale.plotNumber ?? ""} />
          </label>
          <label className="block text-sm">
            Villa
            <input name="villaNumber" className={`${field} mt-1`} defaultValue={sale.villaNumber ?? ""} />
          </label>
          <label className="block text-sm">
            Block
            <input name="block" className={`${field} mt-1`} defaultValue={sale.block ?? ""} />
          </label>
          <label className="block text-sm">
            Tower
            <input name="tower" className={`${field} mt-1`} defaultValue={sale.tower ?? ""} />
          </label>
          <label className="block text-sm">
            Floor
            <input name="floor" className={`${field} mt-1`} defaultValue={sale.floor ?? ""} />
          </label>
        </div>
        <label className="block text-sm">
          Final agreed sale value (₹)
          <input
            name="finalAgreedSaleValue"
            required
            className={`${field} mt-1`}
            defaultValue={sale.finalAgreedSaleValue.toString()}
          />
        </label>
        <label className="block text-sm">
          Booking date
          <input name="bookingDate" type="date" className={`${field} mt-1`} defaultValue={dateValue(sale.bookingDate)} />
        </label>
        <label className="block text-sm">
          Sale status
          <select name="saleStatus" className={`${field} mt-1`} defaultValue={sale.saleStatus}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="block text-sm">
          Notes
          <textarea name="notes" className={`${field} mt-1`} rows={2} defaultValue={sale.notes ?? ""} />
        </label>
      </ActionForm>
    </div>
  );
}
