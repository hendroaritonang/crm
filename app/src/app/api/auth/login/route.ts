import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ message: "Email/password tidak valid" }, { status: 422 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.aktif)
    return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });

  const token = await signToken({ id: user.id, role: user.role, email: user.email });
  await setAuthCookie(token);
  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
