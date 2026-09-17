import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SubnetCreateSchema, expandCidr } from "@/lib/ip";
import { requireApiUser } from "@/lib/auth";

// GET /api/subnet — list + usage
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;

  const subnets = await prisma.subnet.findMany({
    include: { _count: { select: { ips: true } } },
    orderBy: { id: "asc" },
  });
  const used = await prisma.ipAddress.groupBy({
    by: ["subnetId", "status"],
    _count: true,
  });

  const data = subnets.map((s) => {
    const rows = used.filter((u) => u.subnetId === s.id);
    const get = (st: string) => rows.find((r) => r.status === st)?._count ?? 0;
    const total = s._count.ips;
    return {
      ...s,
      total,
      used: get("assigned"),
      free: get("available"),
      reserved: get("reserved"),
    };
  });
  return NextResponse.json({ data });
}

// POST /api/subnet — tambah CIDR + auto generate host
export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = SubnetCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );

  const { cidr, nama, gateway, kategori, vlan_id, deskripsi } = parsed.data;

  // Cek duplikat / overlap sederhana: tolak jika cidr sama persis.
  // Overlap penuh (ex: /24 vs /25) dicek via expand per-octet di phase hardening.
  const exists = await prisma.subnet.findUnique({ where: { cidr } });
  if (exists)
    return NextResponse.json(
      { message: `CIDR overlap dengan ${exists.nama} (${exists.cidr})` },
      { status: 409 }
    );

  const subnet = await prisma.subnet.create({
    data: {
      nama,
      cidr,
      gateway,
      kategori,
      vlanId: vlan_id,
      deskripsi,
      createdBy: auth.user.id,
    },
  });

  const hosts = expandCidr(cidr);
  // Bulk insert bertahap agar tidak berat (chunk 200)
  for (let i = 0; i < hosts.length; i += 200) {
    const chunk = hosts.slice(i, i + 200).map((address) => ({
      address,
      subnetId: subnet.id,
      status: "available" as const,
    }));
    await prisma.ipAddress.createMany({ data: chunk, skipDuplicates: true });
  }

  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      aksi: "subnet.create",
      entity: "subnet",
      entityId: String(subnet.id),
      afterJson: { cidr, total: hosts.length },
    },
  });

  return NextResponse.json(
    { id: subnet.id, cidr, total: hosts.length, free: hosts.length },
    { status: 201 }
  );
}
