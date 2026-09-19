import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  nama: z.string().min(3).max(100),
  tipe: z.string().min(2).max(30),
  ip_mgmt: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "IP tidak valid"),
  lokasi: z.string().max(150).optional(),
  status: z.enum(["online", "offline", "maintenance"]).default("online"),
});

// GET /api/perangkat — list + jumlah IP & target MRTG
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const rows = await prisma.perangkat.findMany({
    include: { _count: { select: { ips: true, mrtgTargets: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ data: rows });
}

// POST /api/perangkat
export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  const created = await prisma.perangkat.create({
    data: {
      nama: parsed.data.nama,
      tipe: parsed.data.tipe,
      ipMgmt: parsed.data.ip_mgmt,
      lokasi: parsed.data.lokasi,
      status: parsed.data.status,
    },
  });
  await prisma.auditLog.create({
    data: { userId: auth.user.id, aksi: "perangkat.create", entity: "perangkat", entityId: String(created.id), afterJson: { nama: created.nama } },
  });
  return NextResponse.json(created, { status: 201 });
}
