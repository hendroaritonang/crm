"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, Empty, Input, PageHeader, TableShell, Td, Th } from "@/components/ui";

type Inv = { id: number; noInvoice: string; jumlah: number; status: string; pelanggan: { nama: string } };

export default function BillingPage() {
  const [periode, setPeriode] = useState("2026-09");
  const [rows, setRows] = useState<Inv[]>([]);
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
    if (!confirm(`Generate invoice periode ${periode} untuk semua pelanggan aktif?`)) return;
    const r = await fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periode }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Berhasil dibuat ${j.created}, lewati ${j.skipped} (sudah ada)` : j.message);
    load();
  }

  async function lunas(id: number, no: string) {
    if (!confirm(`Tandai ${no} lunas?`)) return;
    await fetch(`/api/invoice/${id}/lunas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    load();
  }

  const total = rows.reduce((a, r) => a + r.jumlah, 0);
  const overdue = rows.filter((r) => r.status !== "paid").length;

  return (
    <AppShell>
      <PageHeader
        title="Billing"
        subtitle={`${rows.length} invoice · ${overdue} belum lunas · total Rp${total.toLocaleString("id-ID")}`}
        actions={<Btn variant="primary" size="sm" onClick={generate}><Plus size={15} /> Generate {periode}</Btn>}
      />
      {msg && <p className="mb-4 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">{msg}</p>}
      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <span className="text-xs font-medium text-slate-500">Periode</span>
          <Input value={periode} onChange={(e) => setPeriode(e.target.value)} className="w-32" placeholder="2026-09" />
          <Btn size="sm" onClick={load}>Tampilkan</Btn>
        </div>
        <TableShell>
          <thead><tr><Th>Invoice</Th><Th>Pelanggan</Th><Th>Jumlah</Th><Th>Status</Th><Th>Aksi</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="transition hover:bg-sky-50/50">
                <Td className="font-mono text-xs font-semibold text-sky-700">{r.noInvoice}</Td>
                <Td className="font-medium text-slate-800">{r.pelanggan.nama}</Td>
                <Td className="font-semibold text-slate-800">Rp{r.jumlah.toLocaleString("id-ID")}</Td>
                <Td><Badge value={r.status} /></Td>
                <Td>{r.status !== "paid" && <Btn size="sm" variant="success" onClick={() => lunas(r.id, r.noInvoice)}>Lunas</Btn>}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
        {rows.length === 0 && <Empty text="Belum ada invoice periode ini. Klik Generate." />}
      </Card>
    </AppShell>
  );
}
