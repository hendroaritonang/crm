import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

// GET /api/ip/export?subnetId= — download CSV IP per subnet
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const subnetId = new URL(req.url).searchParams.get("subnetId");
  const rows = await prisma.ipAddress.findMany({
    where: subnetId ? { subnetId: Number(subnetId) } : {},
    include: { pelanggan: { select: { kode: true, nama: true } } },
    orderBy: { address: "asc" },
    take: 5000,
  });

  const csv = toCsv(
    ["address", "status", "pelanggan_kode", "pelanggan_nama", "tipe", "hostname"],
    rows.map((i) => [i.address, i.status, i.pelanggan?.kode ?? "", i.pelanggan?.nama ?? "", i.tipe ?? "", i.hostname ?? ""])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ip-export.csv"`,
    },
  });
}
