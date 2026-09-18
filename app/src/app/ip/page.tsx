"use client";

import { useEffect, useState } from "react";
import { Download, Plus, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, CardHeader, Empty, Field, Input, LinkBtn, PageHeader, TableShell, Td, Th } from "@/components/ui";

type Subnet = { id: number; nama: string; cidr: string; total: number; used: number; free: number };
type Ip = {
  id: number;
  address: string;
  status: string;
  pelanggan: { id: number; kode: string; nama: string } | null;
};

export default function IpPage() {
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [subnetId, setSubnetId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Ip[]>([]);
  const [cidr, setCidr] = useState("");
  const [nama, setNama] = useState("");
  const [msg, setMsg] = useState("");

  async function loadSubnets() {
    const r = await fetch("/api/subnet");
    const j = await r.json();
    if (j.data) {
      setSubnets(j.data);
      if (!subnetId && j.data[0]) setSubnetId(String(j.data[0].id));
    }
  }

  async function loadIps() {
    if (!subnetId) return;
    const r = await fetch(`/api/ip?subnetId=${subnetId}&status=${status}&limit=200`);
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    loadSubnets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    loadIps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subnetId, status]);

  async function addSubnet(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/subnet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, cidr, kategori: "publik" }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Subnet ${j.cidr} dibuat (${j.total} host)` : j.message);
    if (r.ok) {
      setCidr("");
      setNama("");
      loadSubnets();
    }
  }

  async function assign(id: number, address: string) {
    const pelanggan_id = Number(prompt(`Assign ${address} ke ID pelanggan berapa? (lihat di menu Pelanggan)`) ?? "");
    if (!pelanggan_id) return;
    const r = await fetch(`/api/ip/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pelanggan_id }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Assigned ${j.address}` : j.message);
    loadIps();
  }

  async function unassign(id: number, address: string) {
    if (!confirm(`Lepas ${address} dari pelanggannya?`)) return;
    await fetch(`/api/ip/${id}/assign`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
    loadIps();
  }

  return (
    <AppShell>
      <PageHeader
        title="IP & Subnet"
        subtitle="Tambah subnet CIDR, assign IP ke pelanggan, anti double-assign"
        actions={subnetId && <LinkBtn href={`/api/ip/export?subnetId=${subnetId}`} variant="secondary" size="sm"><Download size={14} /> Export CSV</LinkBtn>}
      />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Tambah Subnet" subtitle="Host IP dibuat otomatis" />
            <form onSubmit={addSubnet} className="space-y-3 p-5">
              <Field label="Nama pool"><Input placeholder="Pool Publik 1" value={nama} onChange={(e) => setNama(e.target.value)} required /></Field>
              <Field label="CIDR"><Input placeholder="103.147.9.0/24" value={cidr} onChange={(e) => setCidr(e.target.value)} required /></Field>
              {msg && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">{msg}</p>}
              <Btn variant="primary" className="w-full"><Plus size={15} /> Simpan & Generate IP</Btn>
            </form>
          </Card>
          <Card>
            <CardHeader title="Subnet" subtitle="Pilih untuk lihat IP-nya" />
            <div className="space-y-2 p-4">
              {subnets.map((s) => {
                const pct = s.total ? Math.round((s.used / s.total) * 100) : 0;
                const active = String(s.id) === subnetId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSubnetId(String(s.id))}
                    className={clsx(
                      "block w-full rounded-xl border p-3 text-left transition",
                      active ? "border-sky-500 bg-sky-50/60 ring-1 ring-sky-500/30" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{s.nama}</span>
                      <span className="font-mono text-xs text-slate-500">{s.cidr}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={clsx("h-full rounded-full", pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">{s.used}/{s.total} terpakai ({pct}%) · {s.free} free</div>
                  </button>
                );
              })}
              {subnets.length === 0 && <Empty text="Belum ada subnet. Tambahkan dulu di atas." />}
            </div>
          </Card>
        </div>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Daftar IP"
            subtitle={subnetId ? `${rows.length} IP ditampilkan` : "Pilih subnet dulu"}
            actions={
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {["", "available", "assigned", "reserved"].map((st) => (
                  <button
                    key={st || "all"}
                    onClick={() => setStatus(st)}
                    className={clsx(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      status === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {st === "" ? "Semua" : st}
                  </button>
                ))}
                <button onClick={loadIps} title="Refresh" className="rounded-md px-2 text-slate-500 hover:text-slate-800">
                  <RefreshCw size={14} />
                </button>
              </div>
            }
          />
          <TableShell>
            <thead><tr><Th>IP Address</Th><Th>Status</Th><Th>Pemilik</Th><Th>Aksi</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-sky-50/50">
                  <Td className="font-mono text-[13px] font-medium text-slate-800">{r.address}</Td>
                  <Td><Badge value={r.status} /></Td>
                  <Td className="text-slate-600">{r.pelanggan ? <span><b>{r.pelanggan.kode}</b> {r.pelanggan.nama}</span> : <span className="text-slate-300">—</span>}</Td>
                  <Td>
                    {r.status === "available" ? (
                      <Btn size="sm" variant="primary" onClick={() => assign(r.id, r.address)}>Assign</Btn>
                    ) : (
                      <Btn size="sm" onClick={() => unassign(r.id, r.address)}>Unassign</Btn>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {rows.length === 0 && <Empty text="Tidak ada IP pada filter ini." />}
        </Card>
      </div>
    </AppShell>
  );
}
