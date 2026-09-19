"use client";

import { Fragment, useEffect, useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, CardHeader, Empty, Field, Input, PageHeader, Select, TableShell, Td, Textarea, Th } from "@/components/ui";

type Tiket = { id: number; noTiket: string; judul: string; status: string; prioritas: string; pelanggan: { kode: string } };
type Cust = { id: number; kode: string; nama: string };
type Detail = {
  id: number;
  noTiket: string;
  judul: string;
  status: string;
  kategori: string;
  prioritas: string;
  solusi: string | null;
  pelanggan: { kode: string; nama: string; hp: string };
  assignee: { name: string } | null;
  komentar: { id: number; isi: string; createdAt: string; user: { name: string } | null }[];
};

export default function TiketPage() {
  const [rows, setRows] = useState<Tiket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [custQ, setCustQ] = useState("");
  const [custRows, setCustRows] = useState<Cust[]>([]);
  const [custId, setCustId] = useState("");
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState("lambat");
  const [prioritas, setPrioritas] = useState("normal");
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [komentar, setKomentar] = useState("");
  const [solusi, setSolusi] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/tiket${filter ? `?status=${filter}` : ""}`);
    const j = await r.json();
    if (j.data) setRows(j.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function openDetail(id: number) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    const r = await fetch(`/api/tiket/${id}`);
    const j = await r.json();
    if (j.id) {
      setDetail(j);
      setSolusi(j.solusi ?? "");
    }
  }

  async function advance(id: number, status: string, extra?: Record<string, string>) {
    const r = await fetch(`/api/tiket/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(`Gagal: ${j.message}`);
      return;
    }
    setKomentar("");
    load();
    openDetailRefresh(id);
  }

  async function openDetailRefresh(id: number) {
    const r = await fetch(`/api/tiket/${id}`);
    const j = await r.json();
    if (j.id) {
      setDetail(j);
      setSolusi(j.solusi ?? "");
    }
  }

  async function sendKomentar() {
    if (!openId || !komentar.trim()) return;
    await fetch(`/api/tiket/${openId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ komentar }),
    });
    setKomentar("");
    openDetailRefresh(openId);
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
        subtitle={`${rows.length} tiket — klik baris untuk kronologi & komentar`}
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
              <Fragment key={r.id}>
                <tr key={r.id} className="cursor-pointer transition hover:bg-sky-50/50" onClick={() => openDetail(r.id)}>
                  <Td className="font-mono text-xs font-semibold text-sky-700">{r.noTiket}</Td>
                  <Td className="font-medium text-slate-800">{r.judul}</Td>
                  <Td className="text-slate-500">{r.pelanggan.kode}</Td>
                  <Td><Badge value={r.prioritas} /></Td>
                  <Td><Badge value={r.status} /></Td>
                  <Td>
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {r.status === "open" && <Btn size="sm" variant="primary" onClick={() => advance(r.id, "progress")}>Proses</Btn>}
                      {r.status === "progress" && <Btn size="sm" variant="success" onClick={() => advance(r.id, "resolved")}>Resolve</Btn>}
                      {r.status === "resolved" && <Btn size="sm" onClick={() => advance(r.id, "closed")}>Tutup</Btn>}
                    </div>
                  </Td>
                </tr>
                {openId === r.id && (
                  <tr>
                    <Td colSpan={6} className="!bg-slate-50">
                      {!detail || detail.id !== r.id ? (
                        <p className="py-3 text-center text-xs text-slate-400">Memuat kronologi…</p>
                      ) : (
                        <div className="grid gap-4 py-2 lg:grid-cols-2">
                          <div>
                            <p className="mb-2 text-xs text-slate-500">
                              {detail.pelanggan.nama} ({detail.pelanggan.hp}) · kategori {detail.kategori}
                              {detail.assignee ? ` · Teknisi: ${detail.assignee.name}` : ""}
                            </p>
                            <div className="space-y-2">
                              {detail.komentar.map((k) => (
                                <div key={k.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                                  <p className="text-slate-700">{k.isi}</p>
                                  <p className="mt-1 text-[11px] text-slate-400">{k.user?.name ?? "-"} · {new Date(k.createdAt).toLocaleString("id-ID")}</p>
                                </div>
                              ))}
                              {detail.komentar.length === 0 && <p className="text-xs text-slate-400">Belum ada komentar.</p>}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Input placeholder="Tulis update… (Enter untuk kirim)" value={komentar} onChange={(e) => setKomentar(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendKomentar(); }} />
                              <Btn size="sm" onClick={sendKomentar}><MessageSquare size={14} /></Btn>
                            </div>
                          </div>
                          <div>
                            <Field label="Solusi / penyelesaian">
                              <Textarea rows={3} placeholder="Diisi saat resolve, ex: ganti channel wifi…" value={solusi} onChange={(e) => setSolusi(e.target.value)} />
                            </Field>
                            <div className="mt-2 flex gap-2">
                              <Btn size="sm" variant="success" onClick={() => advance(r.id, "resolved", { solusi })}>Resolve + solusi</Btn>
                              <Btn size="sm" onClick={() => advance(r.id, "closed", { solusi })}>Tutup</Btn>
                            </div>
                          </div>
                        </div>
                      )}
                    </Td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </TableShell>
        {loading && <p className="px-4 py-6 text-center text-sm text-slate-400">Memuat data…</p>}
        {!loading && rows.length === 0 && <Empty text="Tidak ada tiket pada filter ini." />}
      </Card>
    </AppShell>
  );
}
