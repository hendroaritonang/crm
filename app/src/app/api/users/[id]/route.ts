import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser, hashPassword } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  role: z.enum(["owner", "admin", "noc"]).optional(),
  aktif: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(), // reset password oleh owner
});

// PUT /api/users/[id] — owner saja. Cegah nonaktifkan diri sendiri / owner terakhir.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const targetId = Number(id);

  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Validasi gagal" }, { status: 422 });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });

  if (targetId === auth.user.id && parsed.data.aktif === false)
    return NextResponse.json({ message: "Tidak bisa menonaktifkan akun sendiri" }, { status: 409 });

  if (target.role === "owner" && parsed.data.role && parsed.data.role !== "owner") {
    const ownerCount = await prisma.user.count({ where: { role: "owner", aktif: true } });
    if (ownerCount <= 1)
      return NextResponse.json({ message: "Minimal harus ada 1 owner aktif" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      name: parsed.data.name,
      role: parsed.data.role as never,
      aktif: parsed.data.aktif,
      ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
    },
    select: { id: true, name: true, email: true, role: true, aktif: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      aksi: parsed.data.password ? "user.reset-password" : "user.update",
      entity: "user",
      entityId: id,
      afterJson: { role: updated.role, aktif: updated.aktif },
    },
  });

  return NextResponse.json(updated);
}
