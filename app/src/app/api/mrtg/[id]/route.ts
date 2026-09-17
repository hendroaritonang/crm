import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMrtg } from "@/lib/mrtg";
import { requireApiUser } from "@/lib/auth";
import { decryptToken } from "@/lib/crypto";

// GET /api/mrtg/[id]?period=daily — proxy + cache ke server MRTG
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const targetId = Number(id);
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "daily";
  if (!["daily", "weekly", "monthly", "yearly"].includes(period))
    return NextResponse.json({ message: "Period tidak valid" }, { status: 400 });

  const target = await prisma.mrtgTarget.findUnique({
    where: { id: targetId },
    include: {
      ip: true,
      pelanggan: { select: { id: true, kode: true, nama: true } },
    },
  });
  if (!target || !target.aktif)
    return NextResponse.json({ message: "Target MRTG tidak ditemukan" }, { status: 404 });

  // Mode PNG: langsung kembalikan template URL (frontend <img> via proxy tidak wajib di MVP)
  if (target.apiMode === "png") {
    return NextResponse.json({
      target_id: target.id,
      ip: target.ip.address,
      pelanggan: target.pelanggan,
      period,
      api_mode: "png",
      graph_url: target.pngUrlTemplate?.replace("{target}", target.targetIdMrtg).replace("{period}", period),
      cached: false,
      stale: false,
    });
  }

  try {
    let token: string | undefined;
    if (target.authTokenEnc) {
      try {
        token = decryptToken(target.authTokenEnc);
      } catch {
        token = undefined;
      }
    }
    const { payload, cached, stale } = await fetchMrtg(
      target.baseUrl,
      target.targetIdMrtg,
      period,
      token
    );

    await prisma.mrtgTarget.update({
      where: { id: target.id },
      data: { lastFetchedAt: new Date(), lastError: null },
    });

    const vals = payload.data;
    const last = vals[vals.length - 1];
    return NextResponse.json({
      target_id: target.id,
      ip: target.ip.address,
      pelanggan: target.pelanggan,
      period,
      cached,
      stale,
      warning: stale ? "MRTG tidak dapat dijangkau, menampilkan data cache" : undefined,
      fetched_at: payload.updated_at,
      summary: {
        current_in_bps: last?.in_bps ?? 0,
        current_out_bps: last?.out_bps ?? 0,
      },
      data: payload.data,
    });
  } catch {
    await prisma.mrtgTarget.update({
      where: { id: target.id },
      data: { lastError: "MRTG unreachable" },
    });
    return NextResponse.json(
      { message: "MRTG tidak dapat dijangkau dan tidak ada cache", code: "MRTG_DOWN" },
      { status: 502 }
    );
  }
}

// DELETE /api/mrtg/[id] — unlink target
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  await prisma.mrtgTarget.delete({ where: { id: Number(id) } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
