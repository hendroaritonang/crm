"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wifi } from "lucide-react";
import { Btn, Input, Field } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [email, setEmail] = useState("owner@isp.local");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.message ?? "Login gagal");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
            <Wifi size={24} strokeWidth={2.5} />
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight text-white">CRM ISP</span>
            <span className="block text-xs leading-tight text-slate-400">Information System</span>
          </span>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <h1 className="text-base font-bold text-slate-900">Masuk ke dashboard</h1>
          <p className="mb-4 text-xs text-slate-500">Seed awal: owner@isp.local / admin123</p>
          <Field label="Email" className="mb-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </Field>
          <Field label="Password" className="mb-4">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </Field>
          {err && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{err}</p>}
          <Btn variant="primary" className="w-full" disabled={loading}>
            {loading ? "Memeriksa…" : "Masuk"}
          </Btn>
        </form>
        <p className="mt-4 text-center text-[11px] text-slate-500">Akses internal tim ISP — jaga kerahasiaan akun</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
