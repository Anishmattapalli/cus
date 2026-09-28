import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FollowUpForm } from "@/components/FollowUpForm";

import { requirePage } from "@/lib/access";

export default async function ConversationsPage() {
  const { access } = await requirePage("conversations.view");
  const items = await prisma.conversation.findMany({
    include: { customer: true, project: true, sale: true },
    orderBy: { occurredAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Conversations</h1>
      <ol className="space-y-4">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg border border-line bg-paper p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link className="font-medium text-rust" href={`/customers/${c.customerId}`}>
                  {c.customer.fullName}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {c.occurredAt.toLocaleString("en-IN")} · {c.interactionType.replaceAll("_", " ")}
                </span>
                {c.project && <div className="text-muted">{c.project.name}</div>}
              </div>
              {access.keys.has("conversations.create") && (
              <FollowUpForm customerId={c.customerId} projectId={c.projectId ?? undefined} saleId={c.saleId ?? undefined} />
              )}
            </div>
            {c.subject && <div className="mt-1 font-medium">{c.subject}</div>}
            <p className="mt-1">{c.notes}</p>
            {c.followUpRequired && (
              <p className="mt-1 text-due">Follow-up {c.followUpAt?.toLocaleDateString("en-IN")}: {c.followUpNotes}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
