"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { btn, field } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-line bg-paper p-8 shadow-2xl">
      <div>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
          CL
        </div>
        <h1 className="text-xl font-semibold text-ink">Customer Loger</h1>
        <p className="mt-1 text-sm text-muted">Sign in to receivables and follow-up</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        Email
        <input className={`${field} mt-1`} name="email" autoComplete="username" />
      </label>
      <label className="block text-sm">
        Password
        <input className={`${field} mt-1`} name="password" type="password" autoComplete="current-password" />
      </label>
      {state?.error && <p className="text-sm text-due">{state.error}</p>}
      <button className={`${btn} w-full justify-center`}>Sign in</button>
    </form>
  );
}
