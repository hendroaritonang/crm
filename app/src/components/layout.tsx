"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  CircleHelp,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Plus,
  ScrollText,
  Search,
  Server,
  Ticket,
  Users,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import clsx from "clsx";

const SECTIONS = [
  {
    title: "CRM",
    color: "text-violet-500",
    items: [
      { href: "/pelanggan", label: "Customers", icon: Users },
      { href: "/tiket", label: "Tickets", icon: Ticket },
      { href: "/billing", label: "Finance", icon: Wallet },
    ],
  },
  {
    title: "Company",
    color: "text-emerald-500",
    items: [
      { href: "/ip", label: "Networking", icon: Network },
      { href: "/mrtg", label: "Monitoring", icon: Activity },
      { href: "/perangkat", label: "Routers", icon: Server },
      { href: "/paket", label: "Tariff plans", icon: FilePlus2 },
    ],
  },
  {
    title: "System",
    color: "text-slate-400",
    items: [
      { href: "/audit", label: "Administration", icon: ScrollText },
      { href: "/users", label: "Users", icon: Users },
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
    <aside className="flex w-60 shrink-0 flex-col overflow-y-auto rounded-r-3xl border-r border-slate-200/70 bg-white max-md:hidden">
      <SidebarBody pathname={pathname} />
    </aside>
  );
}

function SidebarBody({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <>
      <Link href="/" onClick={onNav} className="flex items-center gap-2 px-5 pb-5 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white">
          <Wifi size={19} strokeWidth={2.5} />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          CRM<span className="font-light text-rose-600">ISP</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-4 px-3 pb-6">
        <Link
          href="/"
          onClick={onNav}
          className={clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            isActive(pathname, "/") ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <LayoutDashboard size={18} className="text-slate-500" />
          Dashboard
        </Link>
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <p className={clsx("mb-1 px-3 text-[11px] font-bold uppercase tracking-widest", s.color)}>
              {s.title}
            </p>
            {s.items.map((it) => {
              const active = isActive(pathname, it.href);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onNav}
                  className={clsx(
                    "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon size={18} className={active ? "text-rose-600" : "text-slate-400"} />
                  <span className="flex-1">{it.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}

const QUICK_ADD = [
  { href: "/pelanggan", label: "Add customer" },
  { href: "/tiket", label: "Add ticket" },
  { href: "/ip", label: "Add subnet / IP" },
  { href: "/billing", label: "Generate invoice" },
];

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [tiketCount, setTiketCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setMe(j))
      .catch(() => null);
    fetch("/api/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setTiketCount(j.tiket_open ?? 0))
      .catch(() => null);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200/70 bg-white/95 px-5 py-3 backdrop-blur">
      {onMenu && (
        <button onClick={onMenu} title="Menu" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 md:hidden">
          <Menu size={19} />
        </button>
      )}
      <form
        className="relative hidden w-full max-w-md sm:block"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/pelanggan?q=${encodeURIComponent(q)}`);
        }}
      >
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers, IP, tickets…"
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100"
        />
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            title="Quick add"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            <Plus size={19} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {QUICK_ADD.map((a) => (
                  <Link key={a.href} href={a.href} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    {a.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
        <button title="Help" className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 sm:flex">
          <CircleHelp size={19} />
        </button>
        <Link href="/tiket" title="Open tickets" className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100">
          <Bell size={19} />
          {tiketCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {tiketCount}
            </span>
          )}
        </Link>
        <Link href="/password" className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
            {me ? me.name.charAt(0).toUpperCase() : "?"}
          </span>
          <span className="hidden text-left lg:block">
            <span className="block text-[13px] font-semibold leading-tight text-slate-800">{me?.name ?? "…"}</span>
            <span className="block text-[11px] capitalize leading-tight text-slate-400">{me?.role ?? ""}</span>
          </span>
          <ChevronDown size={14} className="hidden text-slate-400 lg:block" />
        </Link>
        <button onClick={logout} title="Logout" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen gap-0 bg-[#eef1f6]">
      <Sidebar />
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col overflow-y-auto rounded-r-3xl bg-white shadow-2xl">
            <button onClick={() => setDrawer(false)} title="Tutup" className="absolute right-3 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
              <X size={17} />
            </button>
            <SidebarBody pathname={pathname} onNav={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
