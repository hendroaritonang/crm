import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  nama: z.string().min(3).max(100).optional(),
  tipe: z.string().min(2).max(30).optional(),
  ip_mgmt: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/).optional(),
  lokasi: z.string().max(150).nullable().optional(),
  status: z.enum(["online", "offline", "maintenance"]).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Validasi gagal" }, { status: 422 });
  const updated = await prisma.perangkat.update({
    where: { id: Number(id) },
    data: {
      nama: parsed.data.nama,
      tipe: parsed.data.tipe,
      ipMgmt: parsed.data.ip_mgmt,
      lokasi: parsed.data.lokasi ?? undefined,
      status: parsed.data.status,
    },
  }).catch(() => null);
  if (!updated) return NextResponse.json({ message: "Perangkat tidak ditemukan" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const used = await prisma.ipAddress.count({ where: { perangkatId: Number(id) } });
  if (used > 0)
    return NextResponse.json(
      { message: `${used} IP masih menempel ke perangkat ini. Lepaskan dulu.` },
      { status: 409 }
    );
  await prisma.perangkat.delete({ where: { id: Number(id) } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
