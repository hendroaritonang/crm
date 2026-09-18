"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import {
  LayoutDashboard,
  MonitorDown,
  Pencil,
  Send,
  Settings2,
  Ticket,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Summary = {
  pelanggan_aktif: number;
  pelanggan_baru_bulan_ini: number;
  tiket_open: number;
  perangkat_down: number;
  chart: { labels: string[]; baru: number[]; aktif: number[] };
  finance: {
    bulan_ini: { periode: string; paid_count: number; paid_sum: number; unpaid_count: number; unpaid_sum: number };
    bulan_lalu: { periode: string; paid_count: number; paid_sum: number; unpaid_count: number; unpaid_sum: number };
  };
};

function StatCard({ icon, title, viewHref, value, valueColor }: { icon: React.ReactNode; title: string; viewHref: string; value: string; valueColor: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
        {icon}
        {title}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <Link href={viewHref} className="text-sm font-medium text-sky-600 hover:underline">
          View
        </Link>
        <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
      </div>
    </div>
  );
}

const SHORTCUTS = [
  { href: "/pelanggan", label: "Add customer", icon: <UserPlus size={19} className="text-violet-500" /> },
  { href: "/tiket", label: "Add ticket", icon: <Ticket size={19} className="text-violet-500" /> },
  { href: "/ip", label: "Add subnet / IP", icon: <Wallet size={19} className="text-emerald-500" /> },
  { href: "/billing", label: "Generate invoice", icon: <Wallet size={19} className="text-emerald-500" /> },
  { href: "/mrtg", label: "Monitor traffic", icon: <MonitorDown size={19} className="text-emerald-500" /> },
  { href: "/paket", label: "Add tariff plan", icon: <Wallet size={19} className="text-emerald-500" /> },
  { href: "/users", label: "Add user", icon: <Users size={19} className="text-violet-500" /> },
  { href: "/password", label: "My account", icon: <Settings2 size={19} className="text-slate-500" /> },
];

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function DashboardPage() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setS(j))
      .catch(() => null);
  }, []);

  return (
    <AppShell>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700 text-white">
          <LayoutDashboard size={18} />
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users size={19} className="text-emerald-500" />} title="Active customers" viewHref="/pelanggan" value={s ? String(s.pelanggan_aktif) : "…"} valueColor="text-emerald-500" />
        <StatCard icon={<UserPlus size={19} className="text-sky-500" />} title="New customers" viewHref="/pelanggan" value={s ? String(s.pelanggan_baru_bulan_ini) : "…"} valueColor="text-sky-500" />
        <StatCard icon={<Ticket size={19} className="text-amber-500" />} title="New & open tickets" viewHref="/tiket" value={s ? String(s.tiket_open) : "…"} valueColor="text-amber-500" />
        <StatCard icon={<MonitorDown size={19} className="text-rose-500" />} title="Device down" viewHref="/mrtg" value={s ? String(s.perangkat_down) : "…"} valueColor="text-rose-500" />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-slate-900">Shortcuts</h2>
          <Pencil size={16} className="text-slate-400" />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {SHORTCUTS.map((a) => (
            <Link key={a.label} href={a.href} className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:underline">
              {a.icon}
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-slate-900">Customers chart</h2>
            <span className="ml-auto rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">New</span>
            <span className="rounded-md bg-violet-500 px-2 py-0.5 text-[11px] font-semibold text-white">Active</span>
          </div>
          {s ? (
            <Line
              data={{
                labels: s.chart.labels,
                datasets: [
                  { label: "New customers", data: s.chart.baru, borderColor: "#0ea5e9", backgroundColor: "#0ea5e9", tension: 0.35, pointRadius: 4 },
                  { label: "Active customers", data: s.chart.aktif, borderColor: "#8b5cf6", backgroundColor: "#8b5cf6", tension: 0.35, pointRadius: 4 },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef2f7" } },
                  x: { grid: { color: "#eef2f7" } },
                },
              }}
            />
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">Memuat chart…</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="mb-3 text-[15px] font-bold text-slate-900">Finance</h2>
          {s ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-semibold text-emerald-600">Current month ({s.finance.bulan_ini.periode})</p>
                <FinRow label="Paid invoices" value={`${s.finance.bulan_ini.paid_count} (${rp(s.finance.bulan_ini.paid_sum)})`} />
                <FinRow label="Unpaid invoices" value={`${s.finance.bulan_ini.unpaid_count} (${rp(s.finance.bulan_ini.unpaid_sum)})`} />
              </div>
              <div>
                <p className="mb-1 font-semibold text-amber-500">Last month ({s.finance.bulan_lalu.periode})</p>
                <FinRow label="Paid invoices" value={`${s.finance.bulan_lalu.paid_count} (${rp(s.finance.bulan_lalu.paid_sum)})`} />
                <FinRow label="Unpaid invoices" value={`${s.finance.bulan_lalu.unpaid_count} (${rp(s.finance.bulan_lalu.unpaid_sum)})`} />
              </div>
              <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:underline">
                <Send size={15} /> Open finance
              </Link>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">Memuat…</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function FinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
