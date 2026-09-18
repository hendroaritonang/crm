"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Network,
  ScrollText,
  Search,
  Ticket,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import clsx from "clsx";

const SECTIONS = [
  {
    title: "Utama",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Manajemen",
    items: [
      { href: "/pelanggan", label: "Pelanggan", icon: Users },
      { href: "/ip", label: "IP & Subnet", icon: Network },
      { href: "/mrtg", label: "MRTG", icon: Activity },
    ],
  },
  {
    title: "Operasional",
    items: [
      { href: "/tiket", label: "Tiket", icon: Ticket },
      { href: "/billing", label: "Billing", icon: Wallet },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/audit", label: "Audit Log", icon: ScrollText },
      { href: "/users", label: "Users", icon: KeyRound },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="dark-scroll flex w-60 shrink-0 flex-col overflow-y-auto bg-slate-900 text-slate-300 max-md:hidden">
      <Link href="/" className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
          <Wifi size={20} strokeWidth={2.5} />
        </span>
        <span>
          <span className="block text-[15px] font-bold leading-tight text-white">CRM ISP</span>
          <span className="block text-[11px] leading-tight text-slate-400">Information System</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-5 px-3 pb-6">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {s.title}
            </p>
            {s.items.map((it) => {
              const active = isActive(pathname, it.href);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={clsx(
                    "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                    active
                      ? "bg-sky-500/15 text-white shadow-[inset_2px_0_0_0_#38bdf8]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon size={17} strokeWidth={active ? 2.25 : 2} />
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4 text-[11px] leading-relaxed text-slate-500">
        MVP internal
        <br />
        owner · admin · noc
      </div>
    </aside>
  );
}

export function Topbar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setMe(j))
      .catch(() => null);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
      <form
        className="relative w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/pelanggan?q=${encodeURIComponent(q)}`);
        }}
      >
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama, IP, CUS-xxxx, HP… (Enter)"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </form>
      <div className="ml-auto flex items-center gap-3">
        {me && (
          <Link href="/password" className="hidden text-right sm:block">
            <span className="block text-[13px] font-semibold leading-tight text-slate-800">{me.name}</span>
            <span className="block text-[11px] capitalize leading-tight text-slate-400">{me.role}</span>
          </Link>
        )}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
          {me ? me.name.charAt(0).toUpperCase() : "?"}
        </span>
        <button
          onClick={logout}
          title="Logout"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-5">{children}</main>
        <footer className="flex items-center gap-1.5 px-5 pb-4 text-[11px] text-slate-400">
          <FileText size={12} />
          CRM ISP v0.1 MVP — data internal, jangan dibagikan ke luar tim
        </footer>
      </div>
    </div>
  );
}
