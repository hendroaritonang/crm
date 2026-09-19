import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// POST /api/invoice/[id]/cancel — batalkan invoice (owner/admin)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id: Number(id) } });
  if (!inv) return NextResponse.json({ message: "Invoice tidak ditemukan" }, { status: 404 });
  if (inv.status === "paid")
    return NextResponse.json({ message: "Invoice lunas tidak bisa dibatalkan" }, { status: 409 });
  const updated = await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: "cancel" },
  });
  return NextResponse.json(updated);
}
