"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, Topbar } from "@/components/layout";
import { PELANGGAN_CSV_TEMPLATE } from "@/lib/csv";

type Result = { row: number; nama: string; status: string; message: string; kode?: string };

export default function ImportPage() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<{ dry_run: boolean; total: number; ok: number; errors: number; results: Result[] } | null>(null);
  const [msg, setMsg] = useState("");

  function onFile(f: File | undefined) {
    if (!f) return;
    f.text().then((t) => setText(t));
  }

  async function send(dryRun: boolean) {
    setMsg("");
    const r = await fetch("/api/pelanggan/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text, dry_run: dryRun }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.message ?? "Gagal");
      return;
    }
    setRes(j);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="grid gap-4 p-4 lg:grid-cols-2">
          <div className="rounded border bg-white p-4">
            <Link href="/pelanggan" className="text-xs text-zinc-500 underline">← Kembali</Link>
            <h1 className="mt-1 font-bold">Import Pelanggan CSV</h1>
            <p className="mb-2 text-xs text-zinc-500">
              Header: nama,hp,alamat,email,tipe,ip_address. IP harus sudah ada sebagai available di DB
              (tambah subnet dulu). Maks 500 baris. Selalu dry-run dulu sebelum eksekusi.
            </p>
            <input
              type="file"
              accept=".csv,.txt"
              className="mb-2 text-sm"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <textarea
              className="mb-2 h-48 w-full rounded border p-2 font-mono text-xs"
              placeholder="Paste CSV di sini..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mb-2 flex gap-2">
              <button onClick={() => setText(PELANGGAN_CSV_TEMPLATE)} className="rounded border px-3 py-1 text-sm">Isi template</button>
              <button onClick={() => send(true)} className="rounded border px-3 py-1 text-sm">1. Dry-run (cek)</button>
              <button onClick={() => { if (confirm("Eksekusi import? Data valid akan dibuat.")) send(false); }} className="rounded bg-zinc-900 px-3 py-1 text-sm text-white">2. Eksekusi</button>
            </div>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            {res && <p className="text-sm">Total {res.total} · OK {res.ok} · Error {res.errors} {res.dry_run ? "(dry-run, belum tersimpan)" : "(tersimpan)"}</p>}
          </div>
          <div className="rounded border bg-white p-4">
            <h2 className="mb-2 font-bold">Hasil per baris</h2>
            <div className="max-h-[480px] overflow-auto text-xs">
              {res?.results.map((r, i) => (
                <div key={i} className={`border-b py-1 ${r.status === "error" ? "text-red-600" : ""}`}>
                  Baris {r.row} {r.nama} — {r.status}: {r.message} {r.kode ?? ""}
                </div>
              ))}
              {!res && <p className="text-zinc-500">Belum ada hasil.</p>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
