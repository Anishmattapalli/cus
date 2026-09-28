"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addConversation } from "@/app/actions/records";
import { btn, field } from "./ui";

export function FollowUpForm({
  customerId,
  saleId,
  projectId,
  defaultSubject,
}: {
  customerId: string;
  saleId?: string;
  projectId?: string;
  defaultSubject?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (!open) {
    return (
      <button className={btn} onClick={() => setOpen(true)}>
        Add follow-up
      </button>
    );
  }
  return (
    <form
      className="space-y-2 rounded-md border border-line p-3"
      action={async (fd) => {
        await addConversation(fd);
        setOpen(false);
        router.refresh();
      }}
    >
      <input type="hidden" name="customerId" value={customerId} />
      {saleId && <input type="hidden" name="saleId" value={saleId} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <select name="interactionType" className={field} defaultValue="phone_call">
        <option value="phone_call">Phone Call</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="email">Email</option>
        <option value="meeting">Meeting</option>
        <option value="site_visit">Site Visit</option>
        <option value="other">Other</option>
      </select>
      <input name="subject" className={field} defaultValue={defaultSubject} placeholder="Subject" />
      <textarea name="notes" className={field} required rows={3} placeholder="Conversation notes" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="followUpRequired" defaultChecked /> Follow-up required
      </label>
      <input type="datetime-local" name="followUpAt" className={field} />
      <textarea name="followUpNotes" className={field} rows={2} placeholder="Follow-up notes" />
      <div className="flex gap-2">
        <button className={btn} type="submit">
          Save
        </button>
        <button type="button" className="text-sm text-muted" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
