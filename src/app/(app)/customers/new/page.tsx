import { createCustomer } from "@/app/actions/records";
import { ActionForm } from "@/components/ActionForm";
import { CustomerFormFields } from "@/components/CustomerFormFields";
import { requirePage } from "@/lib/access";

export default async function NewCustomerPage() {
  await requirePage("customers.create");
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">New customer</h1>
      <ActionForm
        className="grid gap-3 sm:grid-cols-2"
        action={createCustomer}
        submitLabel="Create customer"
        successHref="/customers/$id"
      >
        <CustomerFormFields />
      </ActionForm>
    </div>
  );
}
