"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, MapPin, Phone, Unlink } from "lucide-react";
import clsx from "clsx";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, CardHeader, Empty, Field, Input, Select, Textarea, TableShell, Td, Th } from "@/components/ui";
import { MrtgChart } from "@/components/mrtg-chart";

type Detail = {
  id: number;
  kode: string;
  nama: string;
  hp: string;
  email: string | null;
  alamat: string;
  status: string;
  tipe: string;
  catatan: string | null;
  tglJatuhTempo: number;
  paket: { id: number; nama: string; harga: number } | null;
  ips: {
    id: number;
    address: string;
    status: string;
    tipe: string | null;
    hostname: string | null;
    mrtgTarget: { id: number; targetIdMrtg: string } | null;
  }[];
  invoices: { id: number; noInvoice: string; periode: string; jumlah: number; status: string }[];
  tikets: { id: number; noTiket: string; judul: string; status: string }[];
};

const TABS = [
  { key: "info", label: "Info" },
  { key: "ip", label: "IP" },
  { key: "grafik", label: "Grafik MRTG" },
  { key: "tagihan", label: "Tagihan" },
  { key: "tiket", label: "Tiket" },
  { key: "log", label: "Log" },
] as const;

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<string>("info");
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch(`/api/pelanggan/${id}`);
    if (!r.ok) {
      setErr("Pelanggan tidak ditemukan");
      return;
    }
    setD(await r.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (err)
    return (
      <AppShell>
        <p className="text-sm text-rose-600">{err} <Link href="/pelanggan" className="underline">Kembali</Link></p>
      </AppShell>
    );
  if (!d)
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Memuat data pelanggan…</p>
      </AppShell>
    );

  const counts: Record<string, number> = { ip: d.ips.length, tagihan: d.invoices.length, tiket: d.tikets.length };

  return (
    <AppShell>
      <Link href="/pelanggan" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-sky-700">
        <ArrowLeft size={14} /> Kembali ke daftar
      </Link>

      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-xl font-bold text-white shadow-md shadow-sky-500/25">
            {d.nama.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">{d.nama}</h1>
              <Badge value={d.status} />
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">{d.kode}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Phone size={13} /> {d.hp}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={13} /> {d.alamat}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-4 py-2.5">
              <p className="text-lg font-bold text-slate-900">{d.ips.length}</p>
              <p className="text-[11px] text-slate-500">IP</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5">
              <p className="text-lg font-bold text-slate-900">{d.invoices.filter((i) => i.status !== "paid").length}</p>
              <p className="text-[11px] text-slate-500">Blm lunas</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5">
              <p className="text-lg font-bold text-slate-900">{d.tikets.length}</p>
              <p className="text-[11px] text-slate-500">Tiket</p>
            </div>
          </div>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Paket: <b>{d.paket ? `${d.paket.nama} — Rp${d.paket.harga.toLocaleString("id-ID")}` : "belum diset"}</b>
          <span className="text-slate-400"> · Jatuh tempo tiap tanggal {d.tglJatuhTempo}</span>
        </p>
      </Card>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMsg(""); }}
            className={clsx(
              "flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-medium transition",
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
            {counts[t.key] !== undefined && counts[t.key]! > 0 && (
              <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[11px] font-bold text-sky-700">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {msg && <p className="mb-4 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">{msg}</p>}

      {tab === "info" && <TabInfo d={d} reload={load} setMsg={setMsg} />}
      {tab === "ip" && <TabIp d={d} reload={load} setMsg={setMsg} />}
      {tab === "grafik" && <TabGrafik d={d} reload={load} setMsg={setMsg} />}
      {tab === "tagihan" && <TabTagihan d={d} reload={load} />}
      {tab === "tiket" && <TabTiket d={d} reload={load} setMsg={setMsg} />}
      {tab === "log" && <TabLog id={d.id} />}
    </AppShell>
  );
}

/* ---------- Tab Info ---------- */
function TabInfo({ d, reload, setMsg }: { d: Detail; reload: () => void; setMsg: (s: string) => void }) {
  const [form, setForm] = useState({ nama: d.nama, hp: d.hp, alamat: d.alamat, status: d.status, catatan: d.catatan ?? "" });
  const [pakets, setPakets] = useState<{ id: number; nama: string }[]>([]);
  const [paketId, setPaketId] = useState(d.paket?.id ? String(d.paket.id) : "");

  useEffect(() => {
    fetch("/api/paket").then((r) => r.json()).then((j) => j.data && setPakets(j.data)).catch(() => null);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/pelanggan/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, paket_id: paketId ? Number(paketId) : null, catatan: form.catatan || null }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Data pelanggan tersimpan" : j.message ?? "Gagal");
    if (r.ok) reload();
  }

  async function remove() {
    if (!confirm(`Hapus pelanggan ${d.kode}? Harus lepas semua IP dulu.`)) return;
    const r = await fetch(`/api/pelanggan/${d.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(`Gagal: ${j.message}`);
      return;
    }
    window.location.href = "/pelanggan";
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader title="Data Pelanggan" subtitle="Perubahan tercatat di audit log" />
      <form onSubmit={save} className="grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Nama lengkap" className="sm:col-span-2"><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Field>
        <Field label="No HP / WA"><Input value={form.hp} onChange={(e) => setForm({ ...form, hp: e.target.value })} /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {["prospek", "aktif", "nonaktif", "isolir", "berhenti"].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Alamat pemasangan" className="sm:col-span-2"><Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></Field>
        <Field label="Paket internet">
          <Select value={paketId} onChange={(e) => setPaketId(e.target.value)}>
            <option value="">— Tanpa paket —</option>
            {pakets.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </Field>
        <Field label="Catatan"><Textarea rows={2} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></Field>
        <div className="flex gap-2 sm:col-span-2">
          <Btn variant="primary" type="submit">Simpan Perubahan</Btn>
          <Btn variant="danger" type="button" onClick={remove}>Hapus Pelanggan</Btn>
        </div>
      </form>
    </Card>
  );
}

/* ---------- Tab IP ---------- */
function TabIp({ d, reload, setMsg }: { d: Detail; reload: () => void; setMsg: (s: string) => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: number; address: string }[]>([]);

  async function search() {
    const avail = await fetch(`/api/ip?status=available&q=${encodeURIComponent(q)}&limit=20`).then((r) => r.json()).catch(() => ({}));
    const reserv = await fetch(`/api/ip?status=reserved&q=${encodeURIComponent(q)}&limit=20`).then((r) => r.json()).catch(() => ({}));
    setFound([...(avail.data ?? []), ...(reserv.data ?? [])]);
  }

  async function assign(ipId: number) {
    const r = await fetch(`/api/ip/${ipId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pelanggan_id: d.id, tipe: "WAN" }),
    });
    const j = await r.json();
    setMsg(r.ok ? `IP ${j.address} terpasang ke ${d.kode}` : j.message);
    if (r.ok) reload();
  }

  async function unassign(ipId: number, address: string) {
    if (!confirm(`Lepas ${address} dari ${d.kode}?`)) return;
    await fetch(`/api/ip/${ipId}/assign`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
    reload();
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={`IP Terpasang (${d.ips.length})`} />
        <TableShell>
          <tbody>
            {d.ips.map((ip) => (
              <tr key={ip.id} className="transition hover:bg-sky-50/50">
                <Td><span className="font-mono text-[13px] font-semibold">{ip.address}</span><div className="text-xs text-slate-400">{ip.tipe ?? ""} {ip.hostname ?? ""}</div></Td>
                <Td><Badge value={ip.mrtgTarget ? "linked" : "no-mrtg"} /></Td>
                <Td><Btn size="sm" onClick={() => unassign(ip.id, ip.address)}>Unassign</Btn></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
        {d.ips.length === 0 && <Empty text="Belum ada IP terpasang." />}
      </Card>
      <Card>
        <CardHeader title="Pasang IP Baru" subtitle="Hanya IP available yang muncul" />
        <div className="space-y-2 p-4">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
            <Input placeholder="Cari IP available, ex: 103.147.9" value={q} onChange={(e) => setQ(e.target.value)} />
            <Btn type="submit" size="sm">Cari</Btn>
          </form>
          {found.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <span className="font-mono font-medium">{f.address}</span>
              <Btn size="sm" variant="primary" onClick={() => assign(f.id)}>Pasang</Btn>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Tab Grafik ---------- */
function TabGrafik({ d, reload, setMsg }: { d: Detail; reload: () => void; setMsg: (s: string) => void }) {
  const [ipId, setIpId] = useState(d.ips[0] ? String(d.ips[0].id) : "");
  const [mode, setMode] = useState("prtg");
  const [target, setTarget] = useState("");
  const [token, setToken] = useState("");
  const [prtgUser, setPrtgUser] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://prtg.local");

  async function link(e: React.FormEvent) {
    e.preventDefault();
    const authToken =
      mode === "prtg" && (prtgUser || token)
        ? JSON.stringify({ username: prtgUser || undefined, passhash: token || undefined })
        : token || undefined;
    const r = await fetch("/api/mrtg/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip_address_id: Number(ipId), target_id_mrtg: target, base_url: baseUrl, api_mode: mode, ...(authToken ? { auth_token: authToken } : {}) }),
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "IP terhubung" : `Gagal: ${j.message ?? "unknown"}`);
    if (r.ok) reload();
  }

  async function unlink(targetId: number) {
    if (!confirm("Putus hubungan target MRTG ini?")) return;
    await fetch(`/api/mrtg/${targetId}`, { method: "DELETE" });
    reload();
  }

  const linked = d.ips.filter((i) => i.mrtgTarget);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader title="Hubungkan ke Monitoring" subtitle="PRTG: isi sensor ID + user read-only + passhash. Kredensial disimpan terenkripsi." />
        <form onSubmit={link} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="IP"><Select value={ipId} onChange={(e) => setIpId(e.target.value)}>{d.ips.map((i) => <option key={i.id} value={i.id}>{i.address}</option>)}</Select></Field>
          <Field label="Sumber data">
            <Select value={mode} onChange={(e) => { setMode(e.target.value); setBaseUrl(e.target.value === "prtg" ? "https://prtg.local" : "https://mrtg.internal/api"); }}>
              <option value="prtg">PRTG (sensor ID)</option>
              <option value="json">MRTG Generic JSON</option>
              <option value="png">MRTG PNG lawas</option>
            </Select>
          </Field>
          <Field label={mode === "prtg" ? "Sensor ID PRTG (angka)" : "Target ID"}><Input placeholder={mode === "prtg" ? "2041" : "103.147.9.45"} value={target} onChange={(e) => setTarget(e.target.value)} required /></Field>
          <Field label="Base URL" className="lg:col-span-2"><Input placeholder={mode === "prtg" ? "https://prtg.kantor.lan" : "https://mrtg.internal/api"} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required /></Field>
          {mode === "prtg" ? (
            <>
              <Field label="PRTG username (read-only)"><Input placeholder="crm-reader" value={prtgUser} onChange={(e) => setPrtgUser(e.target.value)} /></Field>
              <Field label="Passhash / API token"><Input type="password" placeholder="•••••• (lihat panduan PRTG)" value={token} onChange={(e) => setToken(e.target.value)} /></Field>
            </>
          ) : (
            <Field label="Token (opsional)"><Input type="password" placeholder="••••••" value={token} onChange={(e) => setToken(e.target.value)} /></Field>
          )}
          <div className="flex items-end sm:col-span-2 lg:col-span-3"><Btn variant="primary" type="submit"><Link2 size={15} /> Hubungkan</Btn></div>
        </form>
      </Card>
      {linked.length === 0 && <Card><Empty text="Belum ada IP yang terhubung ke MRTG." /></Card>}
      {linked.map((ip) => (
        <div key={ip.id}>
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="font-mono font-semibold text-slate-800">{ip.address}</span>
            <span className="text-xs text-slate-400">target {ip.mrtgTarget!.targetIdMrtg}</span>
            <button onClick={() => unlink(ip.mrtgTarget!.id)} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"><Unlink size={13} /> Putus</button>
          </div>
          <MrtgChart targetId={ip.mrtgTarget!.id} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Tab Tagihan ---------- */
function TabTagihan({ d, reload }: { d: Detail; reload: () => void }) {
  async function lunas(id: number, no: string) {
    if (!confirm(`Tandai ${no} lunas?`)) return;
    await fetch(`/api/invoice/${id}/lunas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    reload();
  }
  async function cancel(id: number, no: string) {
    if (!confirm(`Batalkan ${no}?`)) return;
    await fetch(`/api/invoice/${id}/cancel`, { method: "POST" });
    reload();
  }
  return (
    <Card>
      <CardHeader title={`Tagihan (${d.invoices.length})`} subtitle="Generate invoice dari menu Billing" />
      <TableShell>
        <thead><tr><Th>Invoice</Th><Th>Periode</Th><Th>Jumlah</Th><Th>Status</Th><Th>Aksi</Th></tr></thead>
        <tbody>
          {d.invoices.map((i) => (
            <tr key={i.id} className="transition hover:bg-sky-50/50">
              <Td className="font-mono text-xs font-semibold text-sky-700">{i.noInvoice}</Td>
              <Td>{i.periode}</Td>
              <Td className="font-semibold">Rp{i.jumlah.toLocaleString("id-ID")}</Td>
              <Td><Badge value={i.status} /></Td>
              <Td>
                <div className="flex gap-1.5">
                  {i.status !== "paid" && i.status !== "cancel" && <Btn size="sm" variant="success" onClick={() => lunas(i.id, i.noInvoice)}>Lunas</Btn>}
                  {i.status !== "paid" && i.status !== "cancel" && <Btn size="sm" onClick={() => cancel(i.id, i.noInvoice)}>Batal</Btn>}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      {d.invoices.length === 0 && <Empty text="Belum ada invoice." />}
    </Card>
  );
}

/* ---------- Tab Tiket ---------- */
function TabTiket({ d, reload, setMsg }: { d: Detail; reload: () => void; setMsg: (s: string) => void }) {
  const [judul, setJudul] = useState("");
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/tiket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pelanggan_id: d.id, judul, kategori: "lambat" }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Tiket ${j.noTiket} dibuat` : j.message);
    if (r.ok) {
      setJudul("");
      reload();
    }
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={`Riwayat Tiket (${d.tikets.length})`} />
        <div className="divide-y divide-slate-100">
          {d.tikets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="font-mono text-xs font-semibold text-sky-700">{t.noTiket}</span>
              <span className="min-w-0 flex-1 truncate text-slate-700">{t.judul}</span>
              <Badge value={t.status} />
            </div>
          ))}
        </div>
        {d.tikets.length === 0 && <Empty text="Belum ada tiket." />}
      </Card>
      <Card>
        <CardHeader title="Buat Tiket Baru" subtitle={`Otomatis terisi ${d.kode}`} />
        <form onSubmit={create} className="flex gap-2 p-4">
          <Input placeholder="Judul gangguan, ex: Internet lambat sejak pagi" value={judul} onChange={(e) => setJudul(e.target.value)} required />
          <Btn variant="primary" type="submit">Buat</Btn>
        </form>
      </Card>
    </div>
  );
}

/* ---------- Tab Log ---------- */
function TabLog({ id }: { id: number }) {
  const [audit, setAudit] = useState<{ id: number; aksi: string; createdAt: string; user: { name: string } | null }[]>([]);
  const [hist, setHist] = useState<{ id: number; aksi: string; alasan: string | null; createdAt: string; ip: { address: string }; byUser: { name: string } | null }[]>([]);
  useEffect(() => {
    fetch(`/api/audit?entity=pelanggan&entity_id=${id}`).then((r) => r.json()).then((j) => j.data && setAudit(j.data)).catch(() => null);
    fetch(`/api/pelanggan/${id}/history`).then((r) => r.json()).then((j) => j.data && setHist(j.data)).catch(() => null);
  }, [id]);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Audit Pelanggan" />
        <div className="divide-y divide-slate-100">
          {audit.map((a) => (
            <div key={a.id} className="px-5 py-2 text-sm text-slate-600">
              <span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString("id-ID")}</span> — <code className="rounded bg-slate-100 px-1 font-mono text-xs">{a.aksi}</code> oleh {a.user?.name ?? "-"}
            </div>
          ))}
        </div>
        {audit.length === 0 && <Empty text="Belum ada log." />}
      </Card>
      <Card>
        <CardHeader title="Riwayat IP" />
        <div className="divide-y divide-slate-100">
          {hist.map((h) => (
            <div key={h.id} className="px-5 py-2 text-sm text-slate-600">
              <span className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString("id-ID")}</span> — <span className="font-mono">{h.ip.address}</span> {h.aksi} oleh {h.byUser?.name ?? "-"}
            </div>
          ))}
        </div>
        {hist.length === 0 && <Empty text="Belum ada riwayat IP." />}
      </Card>
    </div>
  );
}
