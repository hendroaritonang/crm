import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/dashboard/summary — kartu statistik (query ringan, tanpa MRTG live)
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const now = new Date();
  const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [
    pelangganAktif,
    pelangganIsolir,
    ipUsed,
    ipFree,
    tiketOpen,
    omzet,
    tiketTerbaru,
    pelangganTerbaru,
  ] = await Promise.all([
    prisma.pelanggan.count({ where: { status: "aktif", deletedAt: null } }),
    prisma.pelanggan.count({ where: { status: "isolir", deletedAt: null } }),
    prisma.ipAddress.count({ where: { status: "assigned" } }),
    prisma.ipAddress.count({ where: { status: "available" } }),
    prisma.tiket.count({ where: { status: { in: ["open", "progress"] } } }),
    prisma.invoice.aggregate({
      where: { periode, status: "paid" },
      _sum: { jumlah: true },
    }),
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
  ]);

  return NextResponse.json({
    pelanggan_aktif: pelangganAktif,
    pelanggan_isolir: pelangganIsolir,
    ip_used: ipUsed,
    ip_free: ipFree,
    tiket_open: tiketOpen,
    omzet_bulan_ini: omzet._sum.jumlah ?? 0,
    tiket_terbaru: tiketTerbaru,
    pelanggan_terbaru: pelangganTerbaru,
  });
}
