import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

// GET /api/pelanggan/export — download CSV (nama,hp,alamat,email,tipe,ip_address,status,kode)
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const rows = await prisma.pelanggan.findMany({
    where: { deletedAt: null },
    include: { ips: { select: { address: true }, take: 1 } },
    orderBy: { id: "asc" },
    take: 5000,
  });

  const csv = toCsv(
    ["kode", "nama", "hp", "alamat", "email", "tipe", "status", "ip_address"],
    rows.map((p) => [p.kode, p.nama, p.hp, p.alamat, p.email ?? "", p.tipe, p.status, p.ips[0]?.address ?? ""])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pelanggan-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
