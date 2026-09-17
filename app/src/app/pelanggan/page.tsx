"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar, Topbar } from "@/components/layout";

type Row = {
  id: number;
  kode: string;
  nama: string;
  hp: string;
  status: string;
  paket: { nama: string } | null;
  ips: { address: string }[];
};

export default function PelangganPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch(`/api/pelanggan?q=${encodeURIComponent(q)}&limit=50`);
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/pelanggan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, hp, alamat }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.message ?? "Gagal");
      return;
    }
    setNama("");
    setHp("");
    setAlamat("");
    setMsg(`Tersimpan ${j.kode}`);
    load();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="grid gap-4 p-4 lg:grid-cols-3">
          <form onSubmit={create} className="rounded border bg-white p-4">
            <h1 className="mb-2 font-bold">Tambah Pelanggan</h1>
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="HP 08xx" value={hp} onChange={(e) => setHp(e.target.value)} required />
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} required />
            {msg && <p className="mb-2 text-xs text-zinc-600">{msg}</p>}
            <button className="w-full rounded bg-zinc-900 py-2 text-sm text-white">Simpan</button>
          </form>
          <div className="rounded border bg-white p-4 lg:col-span-2">
            <div className="mb-2 flex flex-wrap gap-2">
              <input className="min-w-40 flex-1 rounded border px-3 py-2 text-sm" placeholder="Cari nama / kode / IP / HP" value={q} onChange={(e) => setQ(e.target.value)} />
              <button onClick={load} className="rounded border px-4 text-sm">Cari</button>
              <a href="/api/pelanggan/export" className="rounded border px-3 py-2 text-sm">Export CSV</a>
              <a href="/pelanggan/import" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">Import CSV</a>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th>Kode</th>
                  <th>Nama</th>
                  <th>IP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td><Link href={`/pelanggan/${r.id}`} className="text-blue-600 underline">{r.kode}</Link></td>
                    <td><Link href={`/pelanggan/${r.id}`} className="underline">{r.nama}</Link><div className="text-xs text-zinc-500">{r.hp}</div></td>
                    <td>{r.ips.map((i) => i.address).join(", ") || "-"}</td>
                    <td>{r.status}</td>
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
