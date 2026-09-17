import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser, verifyPassword, hashPassword } from "@/lib/auth";
import { z } from "zod";

// PUT /api/auth/password — ganti password sendiri (semua role)
export async function PUT(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const parsed = z
    .object({ old_password: z.string().min(1), new_password: z.string().min(6).max(100) })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Password baru minimal 6 karakter" }, { status: 422 });

  const me = await prisma.user.findUnique({ where: { id: auth.user.id } });
  if (!me) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });

  const ok = await verifyPassword(parsed.data.old_password, me.passwordHash);
  if (!ok) return NextResponse.json({ message: "Password lama salah" }, { status: 401 });

  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(parsed.data.new_password) },
  });

  return NextResponse.json({ ok: true });
}
