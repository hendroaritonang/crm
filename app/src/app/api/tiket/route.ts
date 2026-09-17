import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";

const CreateSchema = z.object({
  pelanggan_id: z.number().int().positive(),
  judul: z.string().min(3).max(200),
  kategori: z.enum(["mati", "lambat", "instalasi", "adm", "lainnya"]).default("lambat"),
  prioritas: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

// GET /api/tiket?status=open — list tiket + pelanggan + umur
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const status = new URL(req.url).searchParams.get("status") ?? "";
  const rows = await prisma.tiket.findMany({
    where: status ? { status: status as never } : {},
    include: {
      pelanggan: {
        select: { id: true, kode: true, nama: true, ips: { select: { address: true } } },
      },
    },
    orderBy: { id: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: rows });
}

// POST /api/tiket — buat tiket (no auto T-YYYYMM-xxxx)
export async function POST(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );

  const now = new Date();
  const prefix = `T-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const count = await prisma.tiket.count({
    where: { noTiket: { startsWith: prefix } },
  });
  const noTiket = `${prefix}-${String(count + 1).padStart(4, "0")}`;

  const created = await prisma.tiket.create({
    data: {
      noTiket,
      pelangganId: parsed.data.pelanggan_id,
      judul: parsed.data.judul,
      kategori: parsed.data.kategori,
      prioritas: parsed.data.prioritas,
      createdBy: auth.user.id,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
