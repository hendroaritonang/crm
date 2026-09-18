"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Download, Plus, Search, Upload } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, CardHeader, Empty, Field, Input, LinkBtn, PageHeader, TableShell, Td, Th } from "@/components/ui";

type Row = {
  id: number;
  kode: string;
  nama: string;
  hp: string;
  status: string;
  paket: { nama: string } | null;
  ips: { address: string }[];
};

function PelangganInner() {
  const initialQ = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [rows, setRows] = useState<Row[]>([]);
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [msg, setMsg] = useState("");

  async function load(query?: string) {
    const r = await fetch(`/api/pelanggan?q=${encodeURIComponent(query ?? q)}&limit=50`);
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

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
      setMsg(j.message ?? "Gagal menyimpan");
      return;
    }
    setNama("");
    setHp("");
    setAlamat("");
    setMsg(`Tersimpan sebagai ${j.kode}`);
    load();
  }

  return (
    <AppShell>
      <PageHeader
        title="Pelanggan"
        subtitle={`${rows.length} data ditampilkan — klik baris untuk detail, IP, grafik & tagihan`}
        actions={
          <>
            <LinkBtn href="/api/pelanggan/export" variant="secondary" size="sm"><Download size={14} /> Export</LinkBtn>
            <LinkBtn href="/pelanggan/import" variant="secondary" size="sm"><Upload size={14} /> Import</LinkBtn>
          </>
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Tambah Pelanggan" subtitle="ID CUS-xxxx dibuat otomatis" />
          <form onSubmit={create} className="space-y-3 p-5">
            <Field label="Nama lengkap"><Input placeholder="Budi Santoso" value={nama} onChange={(e) => setNama(e.target.value)} required /></Field>
            <Field label="No HP / WA"><Input placeholder="0812xxxxxxx" value={hp} onChange={(e) => setHp(e.target.value)} required /></Field>
            <Field label="Alamat pemasangan"><Input placeholder="Jl. Mawar No. 1" value={alamat} onChange={(e) => setAlamat(e.target.value)} required /></Field>
            {msg && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">{msg}</p>}
            <Btn variant="primary" className="w-full"><Plus size={15} /> Simpan Pelanggan</Btn>
          </form>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Daftar Pelanggan"
            actions={
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Nama / kode / IP / HP" value={q} onChange={(e) => setQ(e.target.value)} className="w-56 pl-8" />
                </div>
                <Btn type="submit" size="sm">Cari</Btn>
              </form>
            }
          />
          <TableShell>
            <thead><tr><Th>Kode</Th><Th>Pelanggan</Th><Th>Paket</Th><Th>IP</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-sky-50/50">
                  <Td><Link href={`/pelanggan/${r.id}`} className="font-mono text-xs font-semibold text-sky-700 hover:underline">{r.kode}</Link></Td>
                  <Td>
                    <Link href={`/pelanggan/${r.id}`} className="font-medium text-slate-800 hover:text-sky-700 hover:underline">{r.nama}</Link>
                    <div className="text-xs text-slate-400">{r.hp}</div>
                  </Td>
                  <Td className="text-slate-500">{r.paket?.nama ?? "—"}</Td>
                  <Td className="font-mono text-xs text-slate-600">{r.ips.map((i) => i.address).join(", ") || "—"}</Td>
                  <Td><Badge value={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {rows.length === 0 && <Empty text="Tidak ada data. Tambahkan pelanggan baru atau ubah kata kunci." />}
        </Card>
      </div>
    </AppShell>
  );
}

export default function PelangganPage() {
  return (
    <Suspense>
      <PelangganInner />
    </Suspense>
  );
}
