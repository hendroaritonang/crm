"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { MonitorPlay } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Card, CardHeader, Empty, PageHeader } from "@/components/ui";
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
      .then((j) => {
        if (j.data?.length) {
          setRows(j.data);
          setSelected(j.data[0].id);
        }
      })
      .catch(() => null);
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Monitoring Trafik (MRTG)"
        subtitle="Grafik per IP/pelanggan langsung dari server MRTG via API"
      />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Target Terhubung" subtitle={`${rows.length} target`} />
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto p-3">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                  selected === r.id ? "border-sky-500 bg-sky-50/60 ring-1 ring-sky-500/30" : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", selected === r.id ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500")}>
                  <MonitorPlay size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[13px] font-semibold text-slate-800">{r.ip.address}</span>
                  <span className="block truncate text-xs text-slate-400">{r.pelanggan ? `${r.pelanggan.kode} · ${r.pelanggan.nama}` : "Tanpa pelanggan"}</span>
                </span>
              </button>
            ))}
            {rows.length === 0 && <Empty text="Belum ada target. Link dari tab Grafik di detail pelanggan." />}
          </div>
        </Card>
        <div className="xl:col-span-2">
          {selected ? (
            <MrtgChart targetId={selected} />
          ) : (
            <Card><Empty text="Pilih target di kiri untuk melihat grafik." /></Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
