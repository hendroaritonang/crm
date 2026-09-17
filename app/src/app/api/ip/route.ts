import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/ip?subnetId=&status=&q=&page= — list IP dengan filter
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const subnetId = searchParams.get("subnetId");
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const where: Record<string, unknown> = {};
  if (subnetId) where.subnetId = Number(subnetId);
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { address: { contains: q } },
      { hostname: { contains: q } },
      { pelanggan: { nama: { contains: q } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.ipAddress.count({ where: where as never }),
    prisma.ipAddress.findMany({
      where: where as never,
      include: {
        pelanggan: { select: { id: true, kode: true, nama: true } },
        subnet: { select: { id: true, nama: true, cidr: true } },
        mrtgTarget: { select: { id: true, aktif: true } },
      },
      orderBy: { address: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ data: rows, meta: { page, limit, total } });
}
