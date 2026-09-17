import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AssignIpSchema } from "@/lib/ip";
import { requireApiUser } from "@/lib/auth";

// POST /api/ip/[id]/assign — assign 1 IP ke 1 pelanggan (anti double)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const ipId = Number(id);
  const body = await req.json();
  const parsed = AssignIpSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ip = await tx.ipAddress.findUnique({ where: { id: ipId } });
      if (!ip) throw Object.assign(new Error("IP tidak ditemukan"), { code: 404 });
      if (ip.status === "assigned")
        throw Object.assign(
          new Error(`IP ${ip.address} sudah dipakai pelanggan #${ip.pelangganId}`),
          { code: 409 }
        );
      if (ip.status !== "available")
        throw Object.assign(
          new Error(`IP ${ip.address} status ${ip.status}, tidak bisa di-assign`),
          { code: 409 }
        );

      const pelanggan = await tx.pelanggan.findUnique({
        where: { id: parsed.data.pelanggan_id },
      });
      if (!pelanggan || pelanggan.deletedAt)
        throw Object.assign(new Error("Pelanggan tidak ditemukan"), { code: 404 });

      const updated = await tx.ipAddress.update({
        where: { id: ipId },
        data: {
          status: "assigned",
          pelangganId: pelanggan.id,
          tipe: parsed.data.tipe,
          hostname: parsed.data.hostname,
          catatan: parsed.data.catatan,
          assignedAt: new Date(),
          assignedById: auth.user.id,
        },
      });

      await tx.ipHistory.create({
        data: {
          ipAddressId: ipId,
          pelangganId: pelanggan.id,
          aksi: "assigned",
          byUserId: auth.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          aksi: "ip.assign",
          entity: "ip",
          entityId: String(ipId),
          afterJson: { address: ip.address, pelanggan_id: pelanggan.id },
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const err = e as { message?: string; code?: number };
    return NextResponse.json(
      { message: err.message ?? "Gagal assign" },
      { status: err.code === 404 ? 404 : 409 }
    );
  }
}

// POST /api/ip/[id]/unassign — lepas IP dari pelanggan
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const ipId = Number(id);
  const body = await req.json().catch(() => ({}));
  const alasan = (body as { alasan?: string }).alasan ?? "";

  const ip = await prisma.ipAddress.findUnique({ where: { id: ipId } });
  if (!ip) return NextResponse.json({ message: "IP tidak ditemukan" }, { status: 404 });

  const updated = await prisma.ipAddress.update({
    where: { id: ipId },
    data: {
      status: "available",
      pelangganId: null,
      assignedAt: null,
      assignedById: null,
    },
  });

  await prisma.ipHistory.create({
    data: {
      ipAddressId: ipId,
      pelangganId: ip.pelangganId,
      aksi: "unassigned",
      alasan,
      byUserId: auth.user.id,
    },
  });

  return NextResponse.json(updated);
}
