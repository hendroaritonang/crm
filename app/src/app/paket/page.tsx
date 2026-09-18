"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Btn, Card, CardHeader, Empty, Field, Input, PageHeader, Select, TableShell, Td, Th } from "@/components/ui";

type Paket = { id: number; nama: string; downMbps: number; upMbps: number; harga: number; tipe: string };

export default function PaketPage() {
  const [rows, setRows] = useState<Paket[]>([]);
  const [form, setForm] = useState({ nama: "", down_mbps: "20", up_mbps: "10", harga: "200000", tipe: "rumahan" });
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/paket");
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/paket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nama: form.nama,
        down_mbps: Number(form.down_mbps),
        up_mbps: Number(form.up_mbps),
        harga: Number(form.harga),
        tipe: form.tipe,
      }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Tariff plan tersimpan" : j.message ?? "Gagal");
    if (r.ok) {
      setForm({ nama: "", down_mbps: "20", up_mbps: "10", harga: "200000", tipe: "rumahan" });
      load();
    }
  }

  return (
    <AppShell>
      <PageHeader title="Tariff Plans" subtitle="Paket internet yang dipakai saat tambah pelanggan" />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Add tariff plan" />
          <form onSubmit={create} className="grid grid-cols-2 gap-3 p-5">
            <Field label="Nama paket" className="col-span-2"><Input placeholder="20 Mbps Rumahan" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></Field>
            <Field label="Download (Mbps)"><Input type="number" min={1} value={form.down_mbps} onChange={(e) => setForm({ ...form, down_mbps: e.target.value })} required /></Field>
            <Field label="Upload (Mbps)"><Input type="number" min={1} value={form.up_mbps} onChange={(e) => setForm({ ...form, up_mbps: e.target.value })} required /></Field>
            <Field label="Harga (Rp)"><Input type="number" min={0} value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} required /></Field>
            <Field label="Tipe">
              <Select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })}>
                <option value="rumahan">rumahan</option>
                <option value="bisnis">bisnis</option>
                <option value="dedicated">dedicated</option>
              </Select>
            </Field>
            {msg && <p className="col-span-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">{msg}</p>}
            <div className="col-span-2"><Btn variant="primary" className="w-full"><Plus size={15} /> Simpan</Btn></div>
          </form>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Daftar paket" subtitle={`${rows.length} paket`} />
          <TableShell>
            <thead><tr><Th>Nama</Th><Th>Speed</Th><Th>Harga</Th><Th>Tipe</Th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="transition hover:bg-sky-50/50">
                  <Td className="font-medium text-slate-800">{p.nama}</Td>
                  <Td className="text-slate-600">↓{p.downMbps} / ↑{p.upMbps} Mbps</Td>
                  <Td className="font-semibold">Rp{p.harga.toLocaleString("id-ID")}</Td>
                  <Td className="capitalize text-slate-500">{p.tipe}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {rows.length === 0 && <Empty text="Belum ada paket." />}
        </Card>
      </div>
    </AppShell>
  );
}
