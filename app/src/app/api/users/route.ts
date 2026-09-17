import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser, hashPassword } from "@/lib/auth";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email().max(150),
  password: z.string().min(6).max(100),
  role: z.enum(["owner", "admin", "noc"]).default("admin"),
});

// GET /api/users — owner saja
export async function GET(req: Request) {
  const auth = await requireApiUser(req, ["owner"]);
  if ("response" in auth) return auth.response;
  const rows = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, aktif: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ data: rows });
}

// POST /api/users — owner saja
export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner"]);
  if ("response" in auth) return auth.response;
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ message: "Email sudah dipakai" }, { status: 409 });

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
    },
    select: { id: true, name: true, email: true, role: true, aktif: true },
  });

  await prisma.auditLog.create({
    data: { userId: auth.user.id, aksi: "user.create", entity: "user", entityId: String(created.id), afterJson: { email: created.email, role: created.role } },
  });

  return NextResponse.json(created, { status: 201 });
}
