"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <form onSubmit={submit} className="w-full max-w-sm rounded bg-white p-6">
      <h1 className="text-lg font-bold">CRM ISP — Login</h1>
      <p className="mb-4 text-xs text-zinc-500">Seed: owner@isp.local / admin123</p>
      <label className="mb-2 block text-sm">
        Email
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
      </label>
      <label className="mb-4 block text-sm">
        Password
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
      </label>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <button
        disabled={loading}
        className="w-full rounded bg-zinc-900 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Masuk..." : "Masuk"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
