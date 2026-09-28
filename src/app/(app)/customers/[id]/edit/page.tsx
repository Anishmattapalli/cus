import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateCustomer } from "@/app/actions/records";
import { ActionForm } from "@/components/ActionForm";
import { CustomerFormFields } from "@/components/CustomerFormFields";
import { requirePage } from "@/lib/access";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("customers.edit");
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <Link href={`/customers/${customer.id}`} className="text-sm text-rust">
          ← Back to customer
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit customer</h1>
        <p className="text-sm text-muted">{customer.customerCode}</p>
      </div>
      <ActionForm
        className="grid gap-3 sm:grid-cols-2"
        action={updateCustomer}
        submitLabel="Save customer"
        successHref={`/customers/${customer.id}`}
      >
        <input type="hidden" name="customerId" value={customer.id} />
        <CustomerFormFields customer={customer} />
      </ActionForm>
    </div>
  );
}
