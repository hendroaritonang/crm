"use client";

import { useState } from "react";
import { Sidebar, Topbar } from "@/components/layout";

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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="grid max-w-lg gap-4 p-4">
          <form onSubmit={submit} className="rounded border bg-white p-4">
            <h1 className="mb-2 font-bold">Ganti Password</h1>
            <input className="mb-2 w-full rounded border px-3 py-2 text-sm" type="password" placeholder="Password lama" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required />
            <input className="mb-3 w-full rounded border px-3 py-2 text-sm" type="password" placeholder="Password baru min 6" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            <button className="w-full rounded bg-zinc-900 py-2 text-sm text-white">Simpan</button>
            {msg && <p className="mt-2 text-sm text-zinc-600">{msg}</p>}
          </form>
          <button onClick={logout} className="rounded border bg-white px-4 py-2 text-sm text-red-600">Logout</button>
        </main>
      </div>
    </div>
  );
}
