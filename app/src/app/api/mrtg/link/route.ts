import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { MrtgLinkSchema } from "@/lib/ip";
import { encryptToken } from "@/lib/crypto";

// GET /api/mrtg/target?q= — list mapping
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const rows = await prisma.mrtgTarget.findMany({
    where: q
      ? {
          OR: [
            { targetIdMrtg: { contains: q } },
            { ip: { address: { contains: q } } },
            { pelanggan: { nama: { contains: q } } },
          ],
        }
      : {},
    include: {
      ip: { select: { address: true } },
      pelanggan: { select: { id: true, kode: true, nama: true } },
    },
    orderBy: { id: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: rows });
}

// POST /api/mrtg/link — hubungkan IP ke target MRTG
export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = MrtgLinkSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );

  const ip = await prisma.ipAddress.findUnique({
    where: { id: parsed.data.ip_address_id },
  });
  if (!ip) return NextResponse.json({ message: "IP tidak ditemukan" }, { status: 404 });

  const authTokenEnc = parsed.data.auth_token ? encryptToken(parsed.data.auth_token) : undefined;

  const created = await prisma.mrtgTarget.upsert({
    where: { ipAddressId: ip.id },
    update: {
      targetIdMrtg: parsed.data.target_id_mrtg,
      perangkatId: parsed.data.perangkat_id,
      interfaceName: parsed.data.interface_name,
      apiMode: parsed.data.api_mode,
      baseUrl: parsed.data.base_url,
      pngUrlTemplate: parsed.data.png_url_template,
      ...(authTokenEnc ? { authTokenEnc } : {}),
      pelangganId: ip.pelangganId,
      aktif: true,
    },
    create: {
      ipAddressId: ip.id,
      targetIdMrtg: parsed.data.target_id_mrtg,
      perangkatId: parsed.data.perangkat_id,
      interfaceName: parsed.data.interface_name,
      apiMode: parsed.data.api_mode,
      baseUrl: parsed.data.base_url,
      pngUrlTemplate: parsed.data.png_url_template,
      authTokenEnc,
      pelangganId: ip.pelangganId,
    },
  });

  // Jangan kembalikan token terenkripsi ke frontend
  const { authTokenEnc: _omit, ...safe } = created;
  void _omit;
  return NextResponse.json(safe, { status: 201 });
}
