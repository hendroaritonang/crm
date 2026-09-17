"use client";

import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";

export default function TiketPage() {
  const [rows, setRows] = useState<{ id: number; noTiket: string; judul: string; status: string; pelanggan: { kode: string } }[]>([]);

  useEffect(() => {
    fetch("/api/tiket")
      .then((r) => r.json())
      .then((j) => j.data && setRows(j.data))
      .catch(() => null);
  }, []);

  async function advance(id: number, status: string) {
    await fetch(`/api/tiket/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="p-4">
          <h1 className="mb-2 text-xl font-bold">Tiket</h1>
          <table className="w-full rounded border bg-white text-sm">
            <thead><tr className="text-left text-zinc-500"><th className="p-2">No</th><th>Judul</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.noTiket}</td>
                  <td>{r.judul}</td>
                  <td>{r.status}</td>
                  <td className="flex gap-2 p-2">
                    <button onClick={() => advance(r.id, "progress")} className="text-blue-600">Proses</button>
                    <button onClick={() => advance(r.id, "resolved")} className="text-green-600">Resolve</button>
                    <button onClick={() => advance(r.id, "closed")} className="text-zinc-600">Close</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}
