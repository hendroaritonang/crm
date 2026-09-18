"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import { AppShell } from "@/components/layout";
import { Btn, Card, Empty, Input, PageHeader, Select } from "@/components/ui";

type Row = {
  id: number;
  aksi: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
};

const ENTITIES = ["", "pelanggan", "subnet", "ip", "invoice", "user"];

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const r = await fetch(`/api/audit?q=${encodeURIComponent(q)}&entity=${entity}&limit=100`);
    if (r.status === 403) {
      setErr("Hanya owner/admin yang bisa melihat audit log.");
      return;
    }
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <PageHeader title="Audit Log" subtitle="Jejak semua perubahan data — siapa, apa, kapan" />
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-slate-100 p-4" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari aksi / entity / email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <Select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-44">
            {ENTITIES.map((en) => <option key={en} value={en}>{en === "" ? "Semua entity" : en}</option>)}
          </Select>
          <Btn type="submit" size="sm">Cari</Btn>
        </form>
        {err && <p className="border-b border-slate-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">{err}</p>}
        <div className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-5 py-2.5 text-sm">
              <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString("id-ID")}</span>
              <code className={clsx("rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700")}>{r.aksi}</code>
              <span className="text-slate-600">{r.entity}#{r.entityId ?? "-"}</span>
              <span className="ml-auto text-xs text-slate-400">{r.user ? `${r.user.name} (${r.user.email})` : "sistem"}</span>
            </div>
          ))}
        </div>
        {rows.length === 0 && !err && <Empty text="Belum ada data pada filter ini." />}
      </Card>
    </AppShell>
  );
}
