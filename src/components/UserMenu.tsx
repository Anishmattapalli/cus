"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";

export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm font-medium text-ink shadow-sm transition hover:border-rust/30 hover:shadow"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
          {initials || "U"}
        </span>
        <span className="hidden sm:inline">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 origin-top-right animate-pop rounded-xl border border-line bg-paper py-1 text-sm shadow-lg">
          <Link className="block px-3 py-2 hover:bg-sand" href="/profile" onClick={() => setOpen(false)}>
            My profile
          </Link>
          <Link className="block px-3 py-2 hover:bg-sand" href="/profile/password" onClick={() => setOpen(false)}>
            Change password
          </Link>
          <form action={logoutAction}>
            <button className="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50" type="submit">
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
