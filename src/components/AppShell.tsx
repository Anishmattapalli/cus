"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserMenu } from "./UserMenu";

const ICONS: Record<string, string> = {
  "/": "M3 12l9-9 9 9M5 10v10h14V10",
  "/projects": "M4 7h16M4 12h16M4 17h10",
  "/customers": "M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0",
  "/sales": "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  "/receipts": "M9 5h12M9 12h12M9 19h12M4 5h.01M4 12h.01M4 19h.01",
  "/payments-due": "M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  "/conversations": "M8 10h8M8 14h5M21 12c0 4.4-4.5 8-10 8l-4 3v-3.4C4.4 18.2 3 15.3 3 12 3 7.6 7.5 4 13 4s8 3.6 8 8z",
  "/documents": "M8 4h6l4 4v12H8zM14 4v4h4",
  "/settings": "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H8a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V8c.3.6.9 1 1.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
};

function NavIcon({ href }: { href: string }) {
  const d = ICONS[href] || ICONS["/"];
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function AppShell({
  userName,
  nav,
  children,
}: {
  userName: string;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function active(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex min-h-screen bg-sand">
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          type="button"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-navy text-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rust text-sm font-bold">CL</span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">Customer Loger</span>
            <span className="block text-[11px] text-white/50">Receivables CRM</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3 pb-6">
          {nav.map((item) => {
            const isOn = active(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                  isOn ? "bg-white/10 text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <NavIcon href={item.href} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-md">
          <button
            className="rounded-lg p-2 text-ink hover:bg-sand lg:hidden"
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <form action="/search" method="get" className="min-w-0 flex-1">
            <input
              name="q"
              placeholder="Search name, mobile, unit, UTR…"
              className="w-full max-w-md rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-rust focus:ring-2 focus:ring-rust/20"
            />
          </form>
          <UserMenu name={userName} />
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
