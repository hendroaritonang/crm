import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const me = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!me) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
  return NextResponse.json(me);
}
