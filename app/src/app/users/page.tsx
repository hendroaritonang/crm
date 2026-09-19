"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { AppShell } from "@/components/layout";
import { Badge, Btn, Card, CardHeader, Empty, Field, Input, PageHeader, Select, TableShell, Td, Th } from "@/components/ui";

type User = { id: number; name: string; email: string; role: string; aktif: boolean };

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPw, setResetPw] = useState("");

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

  async function doResetPw(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    await update(resetTarget.id, { password: resetPw });
    setResetTarget(null);
    setResetPw("");
  }

  return (
    <AppShell>
      <PageHeader title="Manajemen User" subtitle="Owner: tambah user, atur role, nonaktifkan, reset password" />
      {err && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">{err}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Tambah User" />
          <form onSubmit={create} className="space-y-3 p-5">
            <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label="Password awal"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">admin — operasional penuh</option>
                <option value="noc">noc — monitoring & tiket</option>
                <option value="owner">owner — akses penuh</option>
              </Select>
            </Field>
            {msg && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">{msg}</p>}
            <Btn variant="primary" className="w-full"><Plus size={15} /> Simpan User</Btn>
          </form>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Daftar User" subtitle={`${rows.length} akun`} />
          <TableShell>
            <thead><tr><Th>User</Th><Th>Role</Th><Th>Status</Th><Th>Aksi</Th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="transition hover:bg-sky-50/50">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{u.name.charAt(0).toUpperCase()}</span>
                      <span><span className="block font-medium text-slate-800">{u.name}</span><span className="block text-xs text-slate-400">{u.email}</span></span>
                    </div>
                  </Td>
                  <Td>
                    <Select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} className={clsx("w-28 py-1 text-xs")}>
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="noc">noc</option>
                    </Select>
                  </Td>
                  <Td><Badge value={u.aktif ? "aktif" : "nonaktif"} /></Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Btn size="sm" onClick={() => update(u.id, { aktif: !u.aktif })}>{u.aktif ? "Nonaktifkan" : "Aktifkan"}</Btn>
                      <Btn size="sm" onClick={() => { setResetTarget(u); setResetPw(""); }}>Reset PW</Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {rows.length === 0 && !err && <Empty text="Belum ada user." />}
        </Card>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setResetTarget(null)}>
          <form onSubmit={doResetPw} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900">Reset password</h3>
            <p className="mb-3 text-xs text-slate-500">{resetTarget.name} ({resetTarget.email})</p>
            <Field label="Password baru (min 6 karakter)">
              <Input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} required minLength={6} />
            </Field>
            <div className="mt-3 flex gap-2">
              <Btn type="button" className="flex-1" onClick={() => setResetTarget(null)}>Batal</Btn>
              <Btn type="submit" variant="primary" className="flex-1">Simpan</Btn>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
