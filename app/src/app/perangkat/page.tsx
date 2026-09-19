"use client";

import { useEffect, useState } from "react";
import { Activity, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Btn, Card, CardHeader, Empty, Field, Input, PageHeader, Select, TableShell, Td, Th } from "@/components/ui";

type Dev = {
  id: number;
  nama: string;
  tipe: string;
  ipMgmt: string;
  lokasi: string | null;
  status: string;
  _count: { ips: number; mrtgTargets: number };
};

export default function PerangkatPage() {
  const [rows, setRows] = useState<Dev[]>([]);
  const [msg, setMsg] = useState("");
  const [testing, setTesting] = useState<number | null>(null);
  const [form, setForm] = useState({ nama: "", tipe: "mikrotik", ip_mgmt: "", lokasi: "" });

  async function load() {
    const r = await fetch("/api/perangkat");
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/perangkat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(`Gagal: ${j.message ?? "unknown"}`);
      return;
    }
    setMsg(`${j.nama} tersimpan`);
    setForm({ nama: "", tipe: "mikrotik", ip_mgmt: "", lokasi: "" });
    load();
  }

  async function test(id: number) {
    setTesting(id);
    setMsg("");
    const r = await fetch(`/api/perangkat/${id}/test`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setTesting(null);
    setMsg(r.ok ? `${j.ip} OK (${j.latency_ms} ms)` : `Gagal: ${j.message}`);
    load();
  }

  async function setStatus(id: number, status: string) {
    await fetch(`/api/perangkat/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(id: number, nama: string) {
    if (!confirm(`Hapus perangkat ${nama}?`)) return;
    const r = await fetch(`/api/perangkat/${id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Terhapus" : `Gagal: ${j.message}`);
    if (r.ok) load();
  }

  return (
    <AppShell>
      <PageHeader title="Routers & Devices" subtitle="Router, OLT, switch — untuk mapping MRTG & status down" />
      {msg && <p className="mb-4 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">{msg}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Add router" />
          <form onSubmit={create} className="space-y-3 p-5">
            <Field label="Nama"><Input placeholder="CCR-JKT-01" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipe">
                <Select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })}>
                  <option value="mikrotik">mikrotik</option>
                  <option value="cisco">cisco</option>
                  <option value="olt">olt</option>
                  <option value="switch">switch</option>
                  <option value="server">server</option>
                </Select>
              </Field>
              <Field label="IP management"><Input placeholder="192.168.10.1" value={form.ip_mgmt} onChange={(e) => setForm({ ...form, ip_mgmt: e.target.value })} required /></Field>
            </div>
            <Field label="Lokasi / POP"><Input placeholder="POP Jakarta" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></Field>
            <Btn variant="primary" className="w-full"><Plus size={15} /> Simpan</Btn>
          </form>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Daftar perangkat" subtitle={`${rows.length} perangkat`} />
          <TableShell>
            <thead><tr><Th>Nama</Th><Th>IP Mgmt</Th><Th>Status</Th><Th>Terpakai</Th><Th>Aksi</Th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="transition hover:bg-sky-50/50">
                  <Td><span className="font-medium text-slate-800">{d.nama}</span><div className="text-xs capitalize text-slate-400">{d.tipe}{d.lokasi ? ` · ${d.lokasi}` : ""}</div></Td>
                  <Td className="font-mono text-xs">{d.ipMgmt}</Td>
                  <Td>
                    <Select value={d.status} onChange={(e) => setStatus(d.id, e.target.value)} className="w-32 py-1 text-xs">
                      <option value="online">online</option>
                      <option value="offline">offline</option>
                      <option value="maintenance">maintenance</option>
                    </Select>
                  </Td>
                  <Td className="text-xs text-slate-500">{d._count.ips} IP · {d._count.mrtgTargets} MRTG</Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Btn size="sm" variant="primary" onClick={() => test(d.id)} disabled={testing === d.id}>
                        <Activity size={13} /> {testing === d.id ? "…" : "Test"}
                      </Btn>
                      <Btn size="sm" onClick={() => remove(d.id, d.nama)}><Trash2 size={13} /></Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {rows.length === 0 && <Empty text="Belum ada perangkat. Tambahkan router utama dulu." />}
        </Card>
      </div>
      <p className="mt-3 text-xs text-slate-400">Tombol Test melakukan ping 2x dari VPS ke IP management. Hasil gagal otomatis mengubah status jadi offline.</p>
    </AppShell>
  );
}
