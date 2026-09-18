"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, CardHeader, Empty, Field, Input, PageHeader, Select, TableShell, Td, Th } from "@/components/ui";

type Tiket = { id: number; noTiket: string; judul: string; status: string; prioritas: string; pelanggan: { kode: string } };
type Cust = { id: number; kode: string; nama: string };

export default function TiketPage() {
  const [rows, setRows] = useState<Tiket[]>([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [custQ, setCustQ] = useState("");
  const [custRows, setCustRows] = useState<Cust[]>([]);
  const [custId, setCustId] = useState("");
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState("lambat");
  const [prioritas, setPrioritas] = useState("normal");

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

  async function searchCust() {
    const r = await fetch(`/api/pelanggan?q=${encodeURIComponent(custQ)}&limit=10`);
    const j = await r.json();
    if (j.data) {
      setCustRows(j.data);
      if (j.data.length > 0 && !custId) setCustId(String(j.data[0].id));
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/tiket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pelanggan_id: Number(custId), judul, kategori, prioritas }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = j.errors ? ` — ${JSON.stringify(j.errors)}` : "";
      setMsg(`Gagal: ${j.message ?? "unknown"}${detail}`);
      return;
    }
    setMsg(`Tiket ${j.noTiket} dibuat`);
    setJudul("");
    setCustId("");
    setCustQ("");
    setCustRows([]);
    load();
  }

  return (
    <AppShell>
      <PageHeader
        title="Tiket Gangguan"
        subtitle={`${rows.length} tiket ditampilkan`}
        actions={
          <>
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
            <Btn variant="primary" size="sm" onClick={() => setShowForm((s) => !s)}><Plus size={15} /> Buat Tiket</Btn>
          </>
        }
      />
      {msg && <p className="mb-4 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">{msg}</p>}

      {showForm && (
        <Card className="mb-4">
          <CardHeader title="Tiket Baru" subtitle="Pilih pelanggan dulu, lalu isi keluhan" />
          <form onSubmit={create} className="grid gap-3 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Pelanggan">
                <div className="flex gap-2">
                  <Input placeholder="Cari nama / kode / HP…" value={custQ} onChange={(e) => setCustQ(e.target.value)} />
                  <Btn type="button" size="sm" onClick={searchCust}>Cari</Btn>
                </div>
              </Field>
              {custRows.length > 0 && (
                <Select className="mt-2" value={custId} onChange={(e) => setCustId(e.target.value)} required>
                  <option value="">— Pilih pelanggan —</option>
                  {custRows.map((c) => <option key={c.id} value={c.id}>{c.kode} — {c.nama}</option>)}
                </Select>
              )}
            </div>
            <Field label="Judul keluhan" className="sm:col-span-2"><Input placeholder="Internet mati total sejak pagi" value={judul} onChange={(e) => setJudul(e.target.value)} required /></Field>
            <Field label="Kategori">
              <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                <option value="mati">mati</option>
                <option value="lambat">lambat</option>
                <option value="instalasi">instalasi</option>
                <option value="adm">adm</option>
                <option value="lainnya">lainnya</option>
              </Select>
            </Field>
            <Field label="Prioritas">
              <Select value={prioritas} onChange={(e) => setPrioritas(e.target.value)}>
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </Select>
            </Field>
            <div className="sm:col-span-2"><Btn variant="primary" type="submit" disabled={!custId}>Simpan Tiket</Btn></div>
          </form>
        </Card>
      )}

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
