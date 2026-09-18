import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/dashboard/summary — data dashboard ala Splynx (ringan, tanpa MRTG live)
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 6 bulan terakhir untuk chart: label + pelanggan baru per bulan
  const months: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      label: d.toLocaleString("id-ID", { month: "short" }),
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }

  const [
    pelangganAktif,
    pelangganIsolir,
    pelangganBaru,
    ipUsed,
    ipFree,
    tiketOpen,
    tiketBaru,
    perangkatDown,
    omzet,
    tiketTerbaru,
    pelangganTerbaru,
    finCur,
    finPrev,
    newPerMonth,
  ] = await Promise.all([
    prisma.pelanggan.count({ where: { status: "aktif", deletedAt: null } }),
    prisma.pelanggan.count({ where: { status: "isolir", deletedAt: null } }),
    prisma.pelanggan.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.ipAddress.count({ where: { status: "assigned" } }),
    prisma.ipAddress.count({ where: { status: "available" } }),
    prisma.tiket.count({ where: { status: { in: ["open", "progress"] } } }),
    prisma.tiket.count({ where: { status: "open", createdAt: { gte: monthStart } } }),
    prisma.perangkat.count({ where: { status: { not: "online" } } }).catch(() => 0),
    prisma.invoice.aggregate({ where: { periode: cur, status: "paid" }, _sum: { jumlah: true } }),
    prisma.tiket.findMany({
      orderBy: { id: "desc" },
      take: 5,
      include: { pelanggan: { select: { kode: true, nama: true } } },
    }),
    prisma.pelanggan.findMany({
      orderBy: { id: "desc" },
      take: 5,
      select: { id: true, kode: true, nama: true, status: true },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { periode: cur },
      _count: true,
      _sum: { jumlah: true },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { periode: prev },
      _count: true,
      _sum: { jumlah: true },
    }),
    Promise.all(
      months.map((m) =>
        prisma.pelanggan.count({ where: { deletedAt: null, createdAt: { gte: m.start, lt: m.end } } })
      )
    ),
  ]);

  const fin = (rows: { status: string; _count: number; _sum: { jumlah: number | null } }[]) => {
    const paid = rows.find((r) => r.status === "paid");
    const unpaid = rows.filter((r) => r.status !== "paid");
    return {
      paid_count: paid?._count ?? 0,
      paid_sum: paid?._sum.jumlah ?? 0,
      unpaid_count: unpaid.reduce((a, r) => a + r._count, 0),
      unpaid_sum: unpaid.reduce((a, r) => a + (r._sum.jumlah ?? 0), 0),
    };
  };

  // Kumulatif aktif = aproksimasi: total aktif saat ini disebar proporsional (chart tren)
  const totalNew = newPerMonth.reduce((a, n) => a + n, 0);
  let run = Math.max(0, pelangganAktif - totalNew);
  const activeSeries = newPerMonth.map((n) => (run += n));

  return NextResponse.json({
    pelanggan_aktif: pelangganAktif,
    pelanggan_isolir: pelangganIsolir,
    pelanggan_baru_bulan_ini: pelangganBaru,
    ip_used: ipUsed,
    ip_free: ipFree,
    tiket_open: tiketOpen,
    tiket_baru_bulan_ini: tiketBaru,
    perangkat_down: perangkatDown,
    omzet_bulan_ini: omzet._sum.jumlah ?? 0,
    tiket_terbaru: tiketTerbaru,
    pelanggan_terbaru: pelangganTerbaru,
    chart: {
      labels: months.map((m) => m.label),
      baru: newPerMonth,
      aktif: activeSeries,
    },
    finance: {
      bulan_ini: { periode: cur, ...fin(finCur) },
      bulan_lalu: { periode: prev, ...fin(finPrev) },
    },
  });
}
