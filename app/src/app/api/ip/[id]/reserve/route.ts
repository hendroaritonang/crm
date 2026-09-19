import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// POST /api/ip/[id]/reserve — tandai reserved (owner/admin)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const ip = await prisma.ipAddress.findUnique({ where: { id: Number(id) } });
  if (!ip) return NextResponse.json({ message: "IP tidak ditemukan" }, { status: 404 });
  if (ip.status !== "available")
    return NextResponse.json({ message: `IP status ${ip.status}, hanya available yang bisa di-reserve` }, { status: 409 });

  const updated = await prisma.ipAddress.update({
    where: { id: ip.id },
    data: { status: "reserved" },
  });
  await prisma.ipHistory.create({
    data: { ipAddressId: ip.id, aksi: "reserved", byUserId: auth.user.id },
  });
  return NextResponse.json(updated);
}

// POST /api/ip/[id]/release — kembalikan reserved/blocked ke available
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const ip = await prisma.ipAddress.findUnique({ where: { id: Number(id) } });
  if (!ip) return NextResponse.json({ message: "IP tidak ditemukan" }, { status: 404 });
  if (ip.status === "assigned")
    return NextResponse.json({ message: "IP masih assigned — gunakan Unassign" }, { status: 409 });

  const updated = await prisma.ipAddress.update({
    where: { id: ip.id },
    data: { status: "available" },
  });
  await prisma.ipHistory.create({
    data: { ipAddressId: ip.id, aksi: "released", byUserId: auth.user.id },
  });
  return NextResponse.json(updated);
}
