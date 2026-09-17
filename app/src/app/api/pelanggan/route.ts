import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { PelangganCreateSchema } from "@/lib/ip";

// GET /api/pelanggan?q=&status=&page= — search nama/kode/hp + filter status
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { nama: { contains: q } },
      { kode: { contains: q } },
      { hp: { contains: q } },
      { alamat: { contains: q } },
      { ips: { some: { address: { contains: q } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.pelanggan.count({ where: where as never }),
    prisma.pelanggan.findMany({
      where: where as never,
      include: {
        paket: true,
        ips: { select: { id: true, address: true, status: true } },
        _count: { select: { invoices: true, tikets: true } },
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ data: rows, meta: { page, limit, total } });
}

// POST /api/pelanggan — generate kode CUS-xxxx otomatis
export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = PelangganCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );

  const last = await prisma.pelanggan.findFirst({ orderBy: { id: "desc" } });
  const kode = `CUS-${String((last?.id ?? 0) + 1).padStart(4, "0")}`;

  const created = await prisma.pelanggan.create({
    data: {
      kode,
      nama: parsed.data.nama,
      hp: parsed.data.hp,
      alamat: parsed.data.alamat,
      email: parsed.data.email,
      paketId: parsed.data.paket_id,
      tipe: parsed.data.tipe,
      tglJatuhTempo: parsed.data.tgl_jatuh_tempo,
      status: "aktif",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      aksi: "pelanggan.create",
      entity: "pelanggan",
      entityId: String(created.id),
      afterJson: { kode, nama: created.nama },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
