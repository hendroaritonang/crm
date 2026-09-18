"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, Empty, PageHeader, TableShell, Td, Th } from "@/components/ui";

type Tiket = { id: number; noTiket: string; judul: string; status: string; prioritas: string; pelanggan: { kode: string } };

export default function TiketPage() {
  const [rows, setRows] = useState<Tiket[]>([]);
  const [filter, setFilter] = useState("");

  async function load() {
    const r = await fetch(`/api/tiket${filter ? `?status=${filter}` : ""}`);
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function advance(id: number, status: string) {
    await fetch(`/api/tiket/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <AppShell>
      <PageHeader
        title="Tiket Gangguan"
        subtitle={`${rows.length} tiket — buat tiket baru dari detail pelanggan`}
        actions={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {["", "open", "progress", "resolved", "closed"].map((st) => (
              <button
                key={st || "all"}
                onClick={() => setFilter(st)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${filter === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {st === "" ? "Semua" : st}
              </button>
            ))}
          </div>
        }
      />
      <Card>
        <TableShell>
          <thead><tr><Th>No Tiket</Th><Th>Judul</Th><Th>Pelanggan</Th><Th>Prioritas</Th><Th>Status</Th><Th>Aksi</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="transition hover:bg-sky-50/50">
                <Td className="font-mono text-xs font-semibold text-sky-700">{r.noTiket}</Td>
                <Td className="font-medium text-slate-800">{r.judul}</Td>
                <Td className="text-slate-500">{r.pelanggan.kode}</Td>
                <Td><Badge value={r.prioritas} /></Td>
                <Td><Badge value={r.status} /></Td>
                <Td>
                  <div className="flex gap-1.5">
                    {r.status === "open" && <Btn size="sm" variant="primary" onClick={() => advance(r.id, "progress")}>Proses</Btn>}
                    {r.status === "progress" && <Btn size="sm" variant="success" onClick={() => advance(r.id, "resolved")}>Resolve</Btn>}
                    {r.status === "resolved" && <Btn size="sm" onClick={() => advance(r.id, "closed")}>Tutup</Btn>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
        {rows.length === 0 && <Empty text="Tidak ada tiket pada filter ini." />}
      </Card>
    </AppShell>
  );
}
