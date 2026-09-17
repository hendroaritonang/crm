import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/pelanggan", label: "Pelanggan" },
  { href: "/ip", label: "IP & Subnet" },
  { href: "/mrtg", label: "MRTG" },
  { href: "/tiket", label: "Tiket" },
  { href: "/billing", label: "Billing" },
  { href: "/audit", label: "Audit Log" },
  { href: "/users", label: "Users" },
  { href: "/password", label: "Password" },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-zinc-950 p-4 text-zinc-100 max-md:hidden">
      <div className="mb-6 text-lg font-bold">CRM ISP</div>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <p className="mt-8 text-xs text-zinc-500">MVP internal — owner/admin/noc</p>
    </aside>
  );
}

export function Topbar() {
  return (
    <header className="flex items-center gap-3 border-b bg-white px-4 py-3">
      <input
        placeholder="Cari nama / IP / CUS-xxxx ..."
        className="w-full max-w-md rounded border px-3 py-2 text-sm"
      />
      <span className="ml-auto text-sm text-zinc-500">v0.1 MVP</span>
    </header>
  );
}
