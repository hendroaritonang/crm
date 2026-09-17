import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";

// GET /api/invoice?status=&periode=2026-09
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? "";
  const periode = sp.get("periode") ?? "";
  const rows = await prisma.invoice.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(periode ? { periode } : {}),
    },
    include: { pelanggan: { select: { id: true, kode: true, nama: true } } },
    orderBy: { id: "desc" },
    take: 200,
  });
  return NextResponse.json({ data: rows });
}

// POST /api/invoice/generate {periode} — buat 1 invoice per pelanggan aktif
export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const parsed = z.object({ periode: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(
    await req.json()
  );
  if (!parsed.success) return NextResponse.json({ message: "Periode harus YYYY-MM" }, { status: 422 });
  const { periode } = parsed.data;

  const pelanggan = await prisma.pelanggan.findMany({
    where: { status: "aktif", deletedAt: null },
    include: { paket: true },
  });

  let created = 0;
  let skipped = 0;
  for (const p of pelanggan) {
    const jumlah = p.paket?.harga ?? 0;
    const [y, m] = periode.split("-").map(Number);
    const jatuhTempo = new Date(y!, m! - 1, p.tglJatuhTempo || 10);
    const noInvoice = `INV/${periode.replace("-", "/")}/${String(p.id).padStart(4, "0")}`;
    try {
      await prisma.invoice.create({
        data: {
          noInvoice,
          pelangganId: p.id,
          periode,
          jumlah,
          jatuhTempo,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      aksi: "invoice.generate",
      entity: "invoice",
      entityId: periode,
      afterJson: { created, skipped },
    },
  });

  return NextResponse.json({ periode, created, skipped });
}
