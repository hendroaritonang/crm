import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  nama: z.string().min(3).max(150).optional(),
  hp: z.string().regex(/^08[0-9]{8,11}$/).optional(),
  alamat: z.string().min(5).optional(),
  status: z.enum(["prospek", "aktif", "nonaktif", "isolir", "berhenti"]).optional(),
  paket_id: z.number().int().positive().nullable().optional(),
  catatan: z.string().max(1000).nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const row = await prisma.pelanggan.findUnique({
    where: { id: Number(id) },
    include: {
      paket: true,
      ips: { include: { mrtgTarget: true } },
      invoices: { orderBy: { id: "desc" }, take: 10 },
      tikets: { orderBy: { id: "desc" }, take: 10 },
    },
  });
  if (!row || row.deletedAt)
    return NextResponse.json({ message: "Pelanggan tidak ditemukan" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );

  const before = await prisma.pelanggan.findUnique({ where: { id: Number(id) } });
  if (!before || before.deletedAt)
    return NextResponse.json({ message: "Pelanggan tidak ditemukan" }, { status: 404 });

  const updated = await prisma.pelanggan.update({
    where: { id: Number(id) },
    data: {
      nama: parsed.data.nama,
      hp: parsed.data.hp,
      alamat: parsed.data.alamat,
      status: parsed.data.status as never,
      ...(parsed.data.paket_id !== undefined ? { paketId: parsed.data.paket_id } : {}),
      catatan: parsed.data.catatan ?? undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      aksi: "pelanggan.update",
      entity: "pelanggan",
      entityId: id,
      beforeJson: { status: before.status, nama: before.nama },
      afterJson: { status: updated.status, nama: updated.nama },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const usedIp = await prisma.ipAddress.count({
    where: { pelangganId: Number(id), status: "assigned" },
  });
  if (usedIp > 0)
    return NextResponse.json(
      { message: "Pelanggan masih punya IP assigned, unassign dulu" },
      { status: 409 }
    );

  await prisma.pelanggan.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
