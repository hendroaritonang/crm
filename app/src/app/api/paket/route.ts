import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const rows = await prisma.paket.findMany({
    where: { aktif: true },
    orderBy: { harga: "asc" },
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const parsed = z
    .object({
      nama: z.string().min(3).max(100),
      down_mbps: z.number().int().positive(),
      up_mbps: z.number().int().positive(),
      harga: z.number().int().nonnegative(),
      tipe: z.enum(["rumahan", "bisnis", "dedicated"]).default("rumahan"),
    })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Validasi gagal" }, { status: 422 });
  const created = await prisma.paket.create({
    data: {
      nama: parsed.data.nama,
      downMbps: parsed.data.down_mbps,
      upMbps: parsed.data.up_mbps,
      harga: parsed.data.harga,
      tipe: parsed.data.tipe,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
