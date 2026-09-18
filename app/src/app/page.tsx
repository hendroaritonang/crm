"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { Badge, Card, CardHeader, Empty, PageHeader, Stat, LinkBtn } from "@/components/ui";
import { ArrowRight, Ban, Network, Ticket, Users, Wallet } from "lucide-react";

type Summary = {
  pelanggan_aktif: number;
  pelanggan_isolir: number;
  ip_used: number;
  ip_free: number;
  tiket_open: number;
  omzet_bulan_ini: number;
  tiket_terbaru: { id: number; noTiket: string; judul: string; status: string; pelanggan: { kode: string; nama: string } }[];
  pelanggan_terbaru: { id: number; kode: string; nama: string; status: string }[];
};

export default function DashboardPage() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setS(j))
      .catch(() => null);
  }, []);

  const v = (n: number | undefined) => (n ?? "-").toString();

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan operasional ISP hari ini"
        actions={
          <>
            <LinkBtn href="/pelanggan" variant="secondary">Kelola Pelanggan</LinkBtn>
            <LinkBtn href="/ip" variant="primary">Tambah IP / Subnet</LinkBtn>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={<Users size={20} />} label="Pelanggan Aktif" value={v(s?.pelanggan_aktif)} accent="bg-sky-500" />
        <Stat icon={<Ban size={20} />} label="Isolir" value={v(s?.pelanggan_isolir)} accent="bg-rose-500" />
        <Stat icon={<Network size={20} />} label="IP Terpakai" value={v(s?.ip_used)} sub={s ? `${s.ip_free} free` : undefined} accent="bg-indigo-500" />
        <Stat icon={<Ticket size={20} />} label="Tiket Open" value={v(s?.tiket_open)} accent="bg-amber-500" />
        <Stat
          icon={<Wallet size={20} />}
          label="Omzet Bulan Ini"
          value={s ? `Rp${(s.omzet_bulan_ini / 1_000_000).toFixed(1)}jt` : "-"}
          accent="bg-emerald-500"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Tiket Terbaru"
            subtitle="Butuh tindak lanjut teknisi"
            actions={<LinkBtn href="/tiket" variant="ghost" size="sm">Lihat semua <ArrowRight size={14} /></LinkBtn>}
          />
          <div className="divide-y divide-slate-100">
            {s?.tiket_terbaru.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{t.judul}</p>
                  <p className="text-xs text-slate-400">{t.noTiket} · {t.pelanggan.kode} {t.pelanggan.nama}</p>
                </div>
                <Badge value={t.status} />
              </div>
            ))}
            {(!s || s.tiket_terbaru.length === 0) && <Empty text={s ? "Tidak ada tiket. Kerja bagus!" : "Memuat…"} />}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Pelanggan Terbaru"
            subtitle="Pendaftar paling akhir"
            actions={<LinkBtn href="/pelanggan" variant="ghost" size="sm">Lihat semua <ArrowRight size={14} /></LinkBtn>}
          />
          <div className="divide-y divide-slate-100">
            {s?.pelanggan_terbaru.map((p) => (
              <Link key={p.id} href={`/pelanggan/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                  {p.nama.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{p.nama}</p>
                  <p className="text-xs text-slate-400">{p.kode}</p>
                </div>
                <Badge value={p.status} />
              </Link>
            ))}
            {(!s || s.pelanggan_terbaru.length === 0) && <Empty text={s ? "Belum ada pelanggan." : "Memuat…"} />}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
