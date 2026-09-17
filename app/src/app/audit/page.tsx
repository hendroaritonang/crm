"use client";

import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";

type Row = {
  id: number;
  aksi: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
};

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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="p-4">
          <h1 className="mb-2 text-xl font-bold">Audit Log</h1>
          <div className="mb-2 flex gap-2">
            <input className="w-full max-w-md rounded border px-3 py-2 text-sm" placeholder="Cari aksi / entity / email..." value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="rounded border px-2 py-1 text-sm" value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">Semua entity</option>
              <option value="pelanggan">pelanggan</option>
              <option value="subnet">subnet</option>
              <option value="ip">ip</option>
              <option value="invoice">invoice</option>
              <option value="user">user</option>
            </select>
            <button onClick={load} className="rounded border px-4 text-sm">Cari</button>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="rounded border bg-white">
            {rows.map((r) => (
              <div key={r.id} className="border-b px-3 py-1.5 text-sm">
                <span className="text-zinc-500">{new Date(r.createdAt).toLocaleString("id-ID")}</span>
                {" — "}<b>{r.aksi}</b> {r.entity}#{r.entityId ?? "-"}
                {" oleh "}{r.user ? `${r.user.name} (${r.user.email})` : "-"}
              </div>
            ))}
            {rows.length === 0 && !err && <p className="p-3 text-sm text-zinc-500">Belum ada data.</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
