"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Btn, Card, CardHeader, Field, Input, PageHeader } from "@/components/ui";

export default function PasswordPage() {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Password berhasil diganti" : j.message ?? "Gagal");
    if (r.ok) {
      setOldPw("");
      setNewPw("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <AppShell>
      <PageHeader title="Akun Saya" subtitle="Ganti password dan keluar" />
      <div className="grid max-w-lg gap-4">
        <Card>
          <CardHeader title="Ganti Password" />
          <form onSubmit={submit} className="space-y-3 p-5">
            <Field label="Password lama"><Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required /></Field>
            <Field label="Password baru (min 6 karakter)"><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required /></Field>
            {msg && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">{msg}</p>}
            <Btn variant="primary" className="w-full">Simpan Password</Btn>
          </form>
        </Card>
        <Btn variant="danger" onClick={logout}><LogOut size={15} /> Logout dari CRM</Btn>
      </div>
    </AppShell>
  );
}
