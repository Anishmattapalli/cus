import { createProject } from "@/app/actions/projects";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { requirePage } from "@/lib/access";

export default async function NewProjectPage() {
  await requirePage("projects.create");
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">New project</h1>
      <ActionForm
        className="space-y-3"
        action={createProject}
        submitLabel="Create project"
        successHref="/projects/$id"
      >
        <label className="block text-sm">
          Name
          <input name="name" required className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          Property type
          <select name="propertyType" className={`${field} mt-1`} defaultValue="apartment">
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="mixed">Mixed</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-sm">
          Location
          <input name="location" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm">
          Est. project cost (optional)
          <input name="estimatedCost" className={`${field} mt-1`} inputMode="decimal" placeholder="₹" />
        </label>
      </ActionForm>
    </div>
  );
}
