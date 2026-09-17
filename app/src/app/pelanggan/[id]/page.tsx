"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar, Topbar } from "@/components/layout";
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

const TABS = ["info", "ip", "grafik", "tagihan", "tiket", "log"] as const;

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<(typeof TABS)[number]>("info");
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

  if (err) return <div className="p-8 text-sm text-red-600">{err} <Link href="/pelanggan" className="underline">Kembali</Link></div>;
  if (!d)
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col"><Topbar /><main className="p-4 text-sm text-zinc-500">Memuat...</main></div>
      </div>
    );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="p-4">
          <Link href="/pelanggan" className="text-xs text-zinc-500 underline">← Kembali ke list</Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">[{d.kode}] {d.nama}</h1>
            <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white">{d.status}</span>
            <span className="text-sm text-zinc-500">{d.paket ? `${d.paket.nama} Rp${d.paket.harga.toLocaleString("id-ID")}` : "Tanpa paket"}</span>
          </div>
          <div className="mt-1 text-sm text-zinc-600">{d.hp} · {d.alamat}</div>

          <div className="mt-3 flex gap-1 border-b">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setMsg(""); }}
                className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-zinc-900 font-bold" : "text-zinc-500"}`}
              >
                {t === "ip" ? `IP (${d.ips.length})` : t === "tagihan" ? `Tagihan (${d.invoices.length})` : t === "tiket" ? `Tiket (${d.tikets.length})` : t}
              </button>
            ))}
          </div>

          {msg && <p className="mt-2 text-sm text-zinc-600">{msg}</p>}

          <div className="mt-4">
            {tab === "info" && <TabInfo d={d} reload={load} setMsg={setMsg} />}
            {tab === "ip" && <TabIp d={d} reload={load} setMsg={setMsg} />}
            {tab === "grafik" && <TabGrafik d={d} reload={load} setMsg={setMsg} />}
            {tab === "tagihan" && <TabTagihan d={d} reload={load} />}
            {tab === "tiket" && <TabTiket d={d} reload={load} setMsg={setMsg} />}
            {tab === "log" && <TabLog id={d.id} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- Tab Info: edit ---------- */
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
    setMsg(r.ok ? "Tersimpan" : j.message ?? "Gagal");
    if (r.ok) reload();
  }

  return (
    <form onSubmit={save} className="max-w-lg rounded border bg-white p-4">
      <label className="mb-2 block text-sm">Nama<input className="mt-1 w-full rounded border px-3 py-2" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="mb-2 block text-sm">HP<input className="mt-1 w-full rounded border px-3 py-2" value={form.hp} onChange={(e) => setForm({ ...form, hp: e.target.value })} /></label>
        <label className="mb-2 block text-sm">Status
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {["prospek", "aktif", "nonaktif", "isolir", "berhenti"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="mb-2 block text-sm">Alamat<input className="mt-1 w-full rounded border px-3 py-2" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></label>
      <label className="mb-2 block text-sm">Paket
        <select className="mt-1 w-full rounded border px-3 py-2" value={paketId} onChange={(e) => setPaketId(e.target.value)}>
          <option value="">— Tanpa paket —</option>
          {pakets.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
        </select>
      </label>
      <label className="mb-3 block text-sm">Catatan<textarea className="mt-1 w-full rounded border px-3 py-2" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></label>
      <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white">Simpan</button>
    </form>
  );
}

/* ---------- Tab IP: assign / unassign ---------- */
function TabIp({ d, reload, setMsg }: { d: Detail; reload: () => void; setMsg: (s: string) => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: number; address: string }[]>([]);

  async function search() {
    const r = await fetch(`/api/ip?status=available&q=${encodeURIComponent(q)}&limit=20`);
    const j = await r.json();
    if (j.data) setFound(j.data);
  }

  async function assign(ipId: number) {
    const r = await fetch(`/api/ip/${ipId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pelanggan_id: d.id, tipe: "WAN" }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Assigned ${j.address}` : j.message);
    if (r.ok) reload();
  }

  async function unassign(ipId: number) {
    if (!confirm("Unassign IP ini dari pelanggan?")) return;
    await fetch(`/api/ip/${ipId}/assign`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
    reload();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-bold">IP terpasang ({d.ips.length})</h2>
        <table className="w-full text-sm">
          <tbody>
            {d.ips.map((ip) => (
              <tr key={ip.id} className="border-t">
                <td className="py-1">{ip.address}<div className="text-xs text-zinc-500">{ip.tipe ?? ""} {ip.hostname ?? ""}</div></td>
                <td>{ip.mrtgTarget ? "linked" : "no-mrtg"}</td>
                <td><button onClick={() => unassign(ip.id)} className="text-sm text-red-600">Unassign</button></td>
              </tr>
            ))}
            {d.ips.length === 0 && <tr><td className="py-2 text-sm text-zinc-500">Belum ada IP.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-bold">Assign IP available</h2>
        <div className="mb-2 flex gap-2">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Cari IP available, ex: 103.147.9" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={search} className="rounded border px-3 text-sm">Cari</button>
        </div>
        {found.map((f) => (
          <div key={f.id} className="mb-1 flex justify-between rounded border px-2 py-1 text-sm">
            <span>{f.address}</span>
            <button onClick={() => assign(f.id)} className="text-blue-600">Assign ke {d.kode}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tab Grafik: link + chart per target ---------- */
function TabGrafik({ d, reload, setMsg }: { d: Detail; reload: () => void; setMsg: (s: string) => void }) {
  const [ipId, setIpId] = useState(d.ips[0] ? String(d.ips[0].id) : "");
  const [target, setTarget] = useState("");
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://mrtg.internal/api");

  async function link(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/mrtg/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip_address_id: Number(ipId), target_id_mrtg: target, base_url: baseUrl, api_mode: "json", ...(token ? { auth_token: token } : {}) }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Linked" : j.message ?? "Gagal");
    if (r.ok) reload();
  }

  async function unlink(targetId: number) {
    if (!confirm("Unlink target MRTG ini?")) return;
    await fetch(`/api/mrtg/${targetId}`, { method: "DELETE" });
    reload();
  }

  const linked = d.ips.filter((i) => i.mrtgTarget);

  return (
    <div className="grid gap-4">
      <form onSubmit={link} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        <label className="text-sm">IP
          <select className="ml-1 rounded border px-2 py-1" value={ipId} onChange={(e) => setIpId(e.target.value)}>
            {d.ips.map((i) => <option key={i.id} value={i.id}>{i.address}</option>)}
          </select>
        </label>
        <label className="text-sm">Target ID di MRTG
          <input className="ml-1 rounded border px-2 py-1" placeholder="103.147.9.45" value={target} onChange={(e) => setTarget(e.target.value)} required />
        </label>
        <label className="text-sm">Base URL
          <input className="ml-1 w-64 rounded border px-2 py-1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
        </label>
        <label className="text-sm">Token MRTG (opsional)
          <input className="ml-1 rounded border px-2 py-1" type="password" placeholder="disimpan terenkripsi" value={token} onChange={(e) => setToken(e.target.value)} />
        </label>
        <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white">Link</button>
      </form>
      {linked.length === 0 && <p className="text-sm text-zinc-500">Belum ada IP yang di-link ke MRTG. Link dulu via form di atas.</p>}
      {linked.map((ip) => (
        <div key={ip.id}>
          <div className="mb-1 flex items-center gap-2 text-sm">
            <b>{ip.address}</b>
            <span className="text-zinc-500">target {ip.mrtgTarget!.targetIdMrtg}</span>
            <button onClick={() => unlink(ip.mrtgTarget!.id)} className="text-red-600">Unlink</button>
          </div>
          <MrtgChart targetId={ip.mrtgTarget!.id} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Tab Tagihan ---------- */
function TabTagihan({ d, reload }: { d: Detail; reload: () => void }) {
  async function lunas(id: number) {
    await fetch(`/api/invoice/${id}/lunas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    reload();
  }
  return (
    <div className="rounded border bg-white p-4">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-zinc-500"><th>Invoice</th><th>Periode</th><th>Jumlah</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {d.invoices.map((i) => (
            <tr key={i.id} className="border-t">
              <td>{i.noInvoice}</td><td>{i.periode}</td>
              <td>Rp{i.jumlah.toLocaleString("id-ID")}</td><td>{i.status}</td>
              <td>{i.status !== "paid" && <button onClick={() => lunas(i.id)} className="text-green-600">Lunas</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.invoices.length === 0 && <p className="mt-2 text-sm text-zinc-500">Belum ada invoice. Generate dari menu Billing.</p>}
    </div>
  );
}

/* ---------- Tab Tiket: list + buat ---------- */
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
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-bold">Riwayat tiket</h2>
        {d.tikets.map((t) => (
          <div key={t.id} className="mb-1 flex justify-between border-t py-1 text-sm">
            <span>{t.noTiket} — {t.judul}</span><span>{t.status}</span>
          </div>
        ))}
        {d.tikets.length === 0 && <p className="text-sm text-zinc-500">Belum ada tiket.</p>}
      </div>
      <form onSubmit={create} className="rounded border bg-white p-4">
        <h2 className="mb-2 font-bold">Buat tiket</h2>
        <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Judul, ex: Internet lambat" value={judul} onChange={(e) => setJudul(e.target.value)} required />
        <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white">Buat</button>
      </form>
    </div>
  );
}

/* ---------- Tab Log: audit + riwayat IP ---------- */
function TabLog({ id }: { id: number }) {
  const [audit, setAudit] = useState<{ id: number; aksi: string; createdAt: string; user: { name: string } | null }[]>([]);
  const [hist, setHist] = useState<{ id: number; aksi: string; alasan: string | null; createdAt: string; ip: { address: string }; byUser: { name: string } | null }[]>([]);
  useEffect(() => {
    fetch(`/api/audit?entity=pelanggan&entity_id=${id}`).then((r) => r.json()).then((j) => j.data && setAudit(j.data)).catch(() => null);
    fetch(`/api/pelanggan/${id}/history`).then((r) => r.json()).then((j) => j.data && setHist(j.data)).catch(() => null);
  }, [id]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-bold">Audit pelanggan</h2>
        {audit.map((a) => (
          <div key={a.id} className="border-t py-1 text-sm">{new Date(a.createdAt).toLocaleString("id-ID")} — {a.aksi} oleh {a.user?.name ?? "-"}</div>
        ))}
        {audit.length === 0 && <p className="text-sm text-zinc-500">Belum ada log.</p>}
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-bold">Riwayat IP</h2>
        {hist.map((h) => (
          <div key={h.id} className="border-t py-1 text-sm">{new Date(h.createdAt).toLocaleString("id-ID")} — {h.ip.address} {h.aksi} oleh {h.byUser?.name ?? "-"} {h.alasan ?? ""}</div>
        ))}
        {hist.length === 0 && <p className="text-sm text-zinc-500">Belum ada riwayat IP.</p>}
      </div>
    </div>
  );
}
