"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, FileUp, Play } from "lucide-react";
import clsx from "clsx";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, CardHeader, Empty, PageHeader, Textarea } from "@/components/ui";
import { PELANGGAN_CSV_TEMPLATE } from "@/lib/csv";

type Result = { row: number; nama: string; status: string; message: string; kode?: string };

export default function ImportPage() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<{ dry_run: boolean; total: number; ok: number; errors: number; results: Result[] } | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function onFile(f: File | undefined) {
    if (!f) return;
    f.text().then((t) => setText(t));
  }

  async function send(dryRun: boolean) {
    setMsg("");
    setLoading(true);
    const r = await fetch("/api/pelanggan/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text, dry_run: dryRun }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      setMsg(j.message ?? "Gagal");
      return;
    }
    setRes(j);
  }

  return (
    <AppShell>
      <Link href="/pelanggan" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-sky-700">
        <ArrowLeft size={14} /> Kembali ke daftar
      </Link>
      <PageHeader title="Import Pelanggan CSV" subtitle="Maks 500 baris · selalu dry-run dulu sebelum eksekusi" />

      {(res || msg) && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Card className="p-4 text-center"><p className="text-2xl font-bold text-slate-900">{res?.total ?? "—"}</p><p className="text-xs text-slate-500">Total baris</p></Card>
          <Card className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{res?.ok ?? "—"}</p><p className="text-xs text-slate-500">Valid</p></Card>
          <Card className="p-4 text-center"><p className="text-2xl font-bold text-rose-600">{res?.errors ?? "—"}</p><p className="text-xs text-slate-500">Error</p></Card>
        </div>
      )}
      {msg && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{msg}</p>}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="File CSV"
            subtitle="Header: nama,hp,alamat,email,tipe,ip_address — IP harus sudah available di DB"
            actions={<Btn size="sm" onClick={() => setText(PELANGGAN_CSV_TEMPLATE)}>Isi template</Btn>}
          />
          <div className="space-y-3 p-5">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 transition hover:border-sky-400 hover:bg-sky-50/50">
              <FileUp size={18} />
              {text ? "File dimuat — klik untuk ganti" : "Klik untuk pilih file .csv"}
              <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <Textarea rows={8} className="font-mono text-xs" placeholder="…atau paste CSV di sini" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="flex gap-2">
              <Btn onClick={() => send(true)} disabled={loading || !text}><ClipboardCheck size={15} /> 1. Dry-run (cek)</Btn>
              <Btn variant="primary" onClick={() => { if (confirm("Eksekusi import? Baris valid akan dibuat.")) send(false); }} disabled={loading || !text}><Play size={15} /> 2. Eksekusi</Btn>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Hasil per Baris" subtitle={res ? (res.dry_run ? "Mode cek — belum tersimpan" : "Sudah tersimpan") : "Belum ada hasil"} />
          <div className="max-h-[460px] divide-y divide-slate-100 overflow-y-auto">
            {res?.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2 text-[13px]">
                <span className="w-14 shrink-0 font-mono text-xs text-slate-400">#{r.row}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{r.nama || "(tanpa nama)"}</span>
                <Badge value={r.status} />
                <span className={clsx("max-w-56 truncate text-xs", r.status === "error" ? "text-rose-600" : "text-slate-400")}>{r.message}</span>
              </div>
            ))}
          </div>
          {!res && <Empty text="Jalankan dry-run untuk melihat hasil validasi." />}
        </Card>
      </div>
    </AppShell>
  );
}
