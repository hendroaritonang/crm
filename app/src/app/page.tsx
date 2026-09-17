"use client";

import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";

type Summary = {
  pelanggan_aktif: number;
  pelanggan_isolir: number;
  ip_used: number;
  ip_free: number;
  tiket_open: number;
  omzet_bulan_ini: number;
};

export default function DashboardPage() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setS(j))
      .catch(() => null);
  }, []);

  const cards = [
    { label: "Pelanggan Aktif", value: s?.pelanggan_aktif ?? "-" },
    { label: "Isolir", value: s?.pelanggan_isolir ?? "-" },
    { label: "IP Used / Free", value: s ? `${s.ip_used} / ${s.ip_free}` : "-" },
    { label: "Tiket Open", value: s?.tiket_open ?? "-" },
    { label: "Omzet Bulan Ini", value: s ? `Rp${s.omzet_bulan_ini.toLocaleString("id-ID")}` : "-" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="grid flex-1 gap-4 p-4 md:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded border bg-white p-4">
              <div className="text-xs text-zinc-500">{c.label}</div>
              <div className="text-xl font-bold">{c.value}</div>
            </div>
          ))}
          <div className="rounded border bg-white p-4 md:col-span-5">
            <h2 className="mb-2 font-semibold">Langkah awal</h2>
            <ol className="list-decimal pl-5 text-sm text-zinc-600">
              <li>Tambah subnet di menu IP, lalu assign IP ke pelanggan.</li>
              <li>Link target MRTG, lalu cek grafik di menu MRTG / detail pelanggan.</li>
              <li>Generate invoice bulanan di menu Billing.</li>
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}
