import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/pelanggan/[id]/history — riwayat IP (assign/unassign) milik pelanggan ini
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const rows = await prisma.ipHistory.findMany({
    where: { pelangganId: Number(id) },
    include: {
      ip: { select: { address: true } },
      byUser: { select: { name: true } },
    },
    orderBy: { id: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: rows });
}
