"use client";

import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";

export default function BillingPage() {
  const [periode, setPeriode] = useState("2026-09");
  const [rows, setRows] = useState<{ id: number; noInvoice: string; jumlah: number; status: string; pelanggan: { nama: string } }[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch(`/api/invoice?periode=${periode}`);
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    const r = await fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periode }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Dibuat ${j.created}, skip ${j.skipped}` : j.message);
    load();
  }

  async function lunas(id: number) {
    await fetch(`/api/invoice/${id}/lunas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    load();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="p-4">
          <div className="mb-2 flex gap-2">
            <input className="rounded border px-2 py-1 text-sm" value={periode} onChange={(e) => setPeriode(e.target.value)} />
            <button onClick={load} className="rounded border px-3 text-sm">Filter</button>
            <button onClick={generate} className="rounded bg-zinc-900 px-3 text-sm text-white">Generate</button>
            {msg && <span className="text-sm text-zinc-600">{msg}</span>}
          </div>
          <table className="w-full rounded border bg-white text-sm">
            <thead><tr className="text-left text-zinc-500"><th className="p-2">Invoice</th><th>Pelanggan</th><th>Jumlah</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.noInvoice}</td>
                  <td>{r.pelanggan.nama}</td>
                  <td>Rp{r.jumlah.toLocaleString("id-ID")}</td>
                  <td>{r.status}</td>
                  <td className="p-2">{r.status !== "paid" && <button onClick={() => lunas(r.id)} className="text-green-600">Lunas</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}
