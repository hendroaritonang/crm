"use client";

import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";
import { MrtgChart } from "@/components/mrtg-chart";

type Target = {
  id: number;
  targetIdMrtg: string;
  ip: { address: string };
  pelanggan: { kode: string; nama: string } | null;
};

export default function MrtgPage() {
  const [rows, setRows] = useState<Target[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/mrtg/link")
      .then((r) => r.json())
      .then((j) => j.data && setRows(j.data))
      .catch(() => null);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="grid gap-4 p-4 lg:grid-cols-3">
          <div className="rounded border bg-white p-4">
            <h1 className="mb-2 font-bold">Target MRTG</h1>
            {rows.map((r) => (
              <button key={r.id} onClick={() => setSelected(r.id)} className={`mb-1 block w-full rounded border px-2 py-1 text-left text-sm ${selected === r.id ? "bg-zinc-900 text-white" : ""}`}>
                {r.ip.address} — {r.pelanggan ? `${r.pelanggan.kode}` : "tanpa pelanggan"}
              </button>
            ))}
            {rows.length === 0 && <p className="text-sm text-zinc-500">Belum ada target. Link via POST /api/mrtg/link.</p>}
          </div>
          <div className="lg:col-span-2">
            {selected ? <MrtgChart targetId={selected} /> : <p className="text-sm text-zinc-500">Pilih target untuk lihat grafik.</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
