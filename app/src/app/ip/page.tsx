"use client";

import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";

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
  const [assignId, setAssignId] = useState("");
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
    setMsg(r.ok ? `Subnet ${j.cidr} (${j.total} host)` : j.message);
    if (r.ok) {
      setCidr("");
      setNama("");
      loadSubnets();
    }
  }

  async function assign(id: number) {
    const pelanggan_id = Number(prompt("ID pelanggan (angka)?") ?? "");
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

  async function unassign(id: number) {
    if (!confirm("Unassign IP ini?")) return;
    await fetch(`/api/ip/${id}/assign`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
    loadIps();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="grid gap-4 p-4 lg:grid-cols-3">
          <form onSubmit={addSubnet} className="rounded border bg-white p-4">
            <h1 className="mb-2 font-bold">Tambah Subnet</h1>
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Nama (Pool Publik 1)" value={nama} onChange={(e) => setNama(e.target.value)} required />
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="CIDR 103.147.9.0/24" value={cidr} onChange={(e) => setCidr(e.target.value)} required />
            {msg && <p className="mb-2 text-xs text-zinc-600">{msg}</p>}
            <button className="w-full rounded bg-zinc-900 py-2 text-sm text-white">Simpan dan Generate</button>
            <div className="mt-4 text-sm">
              {subnets.map((s) => (
                <button type="button" key={s.id} onClick={() => setSubnetId(String(s.id))} className={`mb-1 block w-full rounded border px-2 py-1 text-left ${String(s.id) === subnetId ? "bg-zinc-900 text-white" : ""}`}>
                  {s.nama} {s.cidr} ({s.used}/{s.total})
                </button>
              ))}
            </div>
          </form>
          <div className="rounded border bg-white p-4 lg:col-span-2">
            <div className="mb-2 flex flex-wrap gap-2">
              <select className="rounded border px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Semua</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="reserved">Reserved</option>
              </select>
              <input className="rounded border px-2 py-1 text-sm" placeholder="ID pelanggan untuk assign cepat" value={assignId} onChange={(e) => setAssignId(e.target.value)} />
              <button onClick={loadIps} className="rounded border px-3 text-sm">Refresh</button>
              <a href={subnetId ? `/api/ip/export?subnetId=${subnetId}` : "/api/ip/export"} className="rounded border px-3 py-1 text-sm">Export CSV</a>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-500"><th>IP</th><th>Status</th><th>Pemilik</th><th>Aksi</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td>{r.address}</td>
                    <td>{r.status}</td>
                    <td>{r.pelanggan ? `${r.pelanggan.kode} ${r.pelanggan.nama}` : "-"}</td>
                    <td>{r.status === "available" ? <button onClick={() => assign(r.id)} className="text-blue-600">Assign</button> : <button onClick={() => unassign(r.id)} className="text-red-600">Unassign</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
