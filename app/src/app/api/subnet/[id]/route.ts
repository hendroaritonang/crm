import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// DELETE /api/subnet/[id] — hapus subnet kosong (owner/admin)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const used = await prisma.ipAddress.count({
    where: { subnetId: Number(id), status: { not: "available" } },
  });
  if (used > 0)
    return NextResponse.json(
      { message: `${used} IP masih dipakai/reserved. Kosongkan dulu sebelum hapus subnet.` },
      { status: 409 }
    );

  await prisma.ipAddress.deleteMany({ where: { subnetId: Number(id) } });
  await prisma.subnet.delete({ where: { id: Number(id) } }).catch(() => null);
  await prisma.auditLog.create({
    data: { userId: auth.user.id, aksi: "subnet.delete", entity: "subnet", entityId: id },
  });
  return NextResponse.json({ ok: true });
}
