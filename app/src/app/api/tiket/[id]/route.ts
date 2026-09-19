import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["open", "progress", "resolved", "closed"]).optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
  solusi: z.string().max(2000).nullable().optional(),
  komentar: z.string().max(2000).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const row = await prisma.tiket.findUnique({
    where: { id: Number(id) },
    include: {
      pelanggan: { select: { id: true, kode: true, nama: true, hp: true } },
      assignee: { select: { id: true, name: true } },
      komentar: {
        include: { user: { select: { name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!row) return NextResponse.json({ message: "Tiket tidak ditemukan" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ message: "Validasi gagal" }, { status: 422 });

  const updated = await prisma.tiket.update({
    where: { id: Number(id) },
    data: {
      status: parsed.data.status as never,
      assigneeId: parsed.data.assignee_id ?? undefined,
      solusi: parsed.data.solusi ?? undefined,
      closedAt:
        parsed.data.status === "closed" || parsed.data.status === "resolved"
          ? new Date()
          : undefined,
    },
  });

  if (parsed.data.komentar) {
    await prisma.tiketKomentar.create({
      data: { tiketId: updated.id, userId: auth.user.id, isi: parsed.data.komentar },
    });
  }

  return NextResponse.json(updated);
}
