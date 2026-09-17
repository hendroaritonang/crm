import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// POST /api/invoice/[id]/lunas — tandai bayar manual
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { metode?: string };
  const updated = await prisma.invoice.update({
    where: { id: Number(id) },
    data: { status: "paid", paidAt: new Date(), metode: body.metode ?? "manual" },
  });
  return NextResponse.json(updated);
}
