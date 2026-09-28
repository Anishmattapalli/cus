import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProject } from "@/app/actions/projects";
import { ActionForm } from "@/components/ActionForm";
import { field } from "@/components/ui";
import { requirePage } from "@/lib/access";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("projects.edit");
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <Link href={`/projects/${project.id}`} className="text-sm text-rust">
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit project</h1>
        <p className="text-sm text-muted">{project.code}</p>
      </div>
      <ActionForm
        className="space-y-3"
        action={updateProject}
        submitLabel="Save project"
        successHref={`/projects/${project.id}`}
      >
        <input type="hidden" name="projectId" value={project.id} />
        <label className="block text-sm">
          Name
          <input name="name" required className={`${field} mt-1`} defaultValue={project.name} />
        </label>
        <label className="block text-sm">
          Property type
          <select name="propertyType" className={`${field} mt-1`} defaultValue={project.propertyType}>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="mixed">Mixed</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-sm">
          Location
          <input name="location" className={`${field} mt-1`} defaultValue={project.location ?? ""} />
        </label>
        <label className="block text-sm">
          Est. project cost (optional)
          <input
            name="estimatedCost"
            className={`${field} mt-1`}
            inputMode="decimal"
            placeholder="₹"
            defaultValue={project.estimatedCost?.toString() ?? ""}
          />
        </label>
        <label className="block text-sm">
          Status
          <select name="status" className={`${field} mt-1`} defaultValue={project.status}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block text-sm">
          Description
          <textarea name="description" className={`${field} mt-1`} rows={3} defaultValue={project.description ?? ""} />
        </label>
        <label className="block text-sm">
          Notes
          <textarea name="notes" className={`${field} mt-1`} rows={3} defaultValue={project.notes ?? ""} />
        </label>
      </ActionForm>
    </div>
  );
}
