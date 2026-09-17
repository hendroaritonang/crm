"use client";

import { useEffect, useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";

type User = { id: number; name: string; email: string; role: string; aktif: boolean };

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });

  async function load() {
    setErr("");
    const r = await fetch("/api/users");
    if (r.status === 403) {
      setErr("Hanya owner yang bisa mengelola user.");
      return;
    }
    const j = await r.json();
    if (j.data) setRows(j.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    setMsg(r.ok ? `User ${j.email} dibuat` : j.message ?? "Gagal");
    if (r.ok) {
      setForm({ name: "", email: "", password: "", role: "admin" });
      load();
    }
  }

  async function update(id: number, patch: Record<string, unknown>) {
    const r = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json();
    setMsg(r.ok ? "Tersimpan" : j.message ?? "Gagal");
    if (r.ok) load();
  }

  async function resetPassword(id: number) {
    const password = prompt("Password baru (min 6 karakter)?");
    if (!password) return;
    update(id, { password });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="grid gap-4 p-4 lg:grid-cols-3">
          <form onSubmit={create} className="rounded border bg-white p-4">
            <h1 className="mb-2 font-bold">Tambah User</h1>
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Password min 6" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <select className="mb-3 w-full rounded border px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">admin</option>
              <option value="noc">noc</option>
              <option value="owner">owner</option>
            </select>
            <button className="w-full rounded bg-zinc-900 py-2 text-sm text-white">Simpan</button>
            {msg && <p className="mt-2 text-xs text-zinc-600">{msg}</p>}
            {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          </form>
          <div className="rounded border bg-white p-4 lg:col-span-2">
            <h2 className="mb-2 font-bold">Daftar User</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-500"><th>Nama</th><th>Role</th><th>Aktif</th><th>Aksi</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td>{u.name}<div className="text-xs text-zinc-500">{u.email}</div></td>
                    <td>
                      <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} className="rounded border px-1 py-0.5">
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                        <option value="noc">noc</option>
                      </select>
                    </td>
                    <td>{u.aktif ? "ya" : "tidak"}</td>
                    <td className="flex gap-2">
                      <button onClick={() => update(u.id, { aktif: !u.aktif })} className="text-blue-600">{u.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      <button onClick={() => resetPassword(u.id)} className="text-zinc-600">Reset PW</button>
                    </td>
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
