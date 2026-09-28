import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/ActionForm";
import { field, Panel } from "@/components/ui";
import { saveDocumentMeta } from "@/app/actions/records";

import { requirePage } from "@/lib/access";

export default async function DocumentsPage() {
  const { access } = await requirePage("documents.view");
  const [docs, customers, projects] = await Promise.all([
    prisma.document.findMany({
      include: { customer: true, project: true, sale: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { fullName: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <ul className="space-y-2 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="rounded-lg border border-line bg-paper p-3">
              <div className="font-medium">{d.name}</div>
              <div className="text-muted capitalize">{d.documentType.replaceAll("_", " ")}</div>
              {d.customer && (
                <Link className="text-rust" href={`/customers/${d.customerId}`}>
                  {d.customer.fullName}
                </Link>
              )}
              {d.project && <span className="text-muted"> · {d.project.name}</span>}
            </li>
          ))}
        </ul>
      </div>
      {access.keys.has("documents.upload") && (
      <Panel title="Add document record">
        <p className="mb-3 text-xs text-muted">Standalone V1 stores a document record. File upload can be added later without changing the data model.</p>
        <ActionForm className="space-y-2" action={saveDocumentMeta} submitLabel="Save">
          <input name="name" className={field} placeholder="Document name" required />
          <select name="documentType" className={field} defaultValue="other">
            {["pan", "id_proof", "booking_form", "agreement", "sale_deed", "payment_proof", "bank_document", "correspondence", "other"].map(
              (t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ),
            )}
          </select>
          <select name="customerId" className={field} defaultValue="">
            <option value="">Customer (optional)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
          <select name="projectId" className={field} defaultValue="">
            <option value="">Project (optional)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <textarea name="description" className={field} rows={2} placeholder="Description" />
        </ActionForm>
      </Panel>
      )}
    </div>
  );
}
