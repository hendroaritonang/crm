import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";

const MAX_ROWS = 500;
const HP_RE = /^08[0-9]{8,11}$/;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

type ImportResult = {
  row: number;
  nama: string;
  status: "ok" | "error" | "skip";
  message: string;
  kode?: string;
};

// POST /api/pelanggan/import {csv: string, dry_run?: boolean}
// Body JSON (bukan multipart) agar simpel dari fetch + curl.
export async function POST(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    csv?: string;
    dry_run?: boolean;
  } | null;
  if (!body?.csv) return NextResponse.json({ message: "Field csv wajib" }, { status: 422 });

  const { headers, rows } = parseCsv(body.csv);
  if (!headers.includes("nama") || !headers.includes("hp") || !headers.includes("alamat"))
    return NextResponse.json(
      { message: "Header wajib: nama,hp,alamat (opsional: email,tipe,ip_address)" },
      { status: 422 }
    );
  if (rows.length === 0) return NextResponse.json({ message: "CSV kosong" }, { status: 422 });
  if (rows.length > MAX_ROWS)
    return NextResponse.json({ message: `Maksimal ${MAX_ROWS} baris per import` }, { status: 422 });

  const dryRun = body.dry_run !== false; // default dry-run dulu (aman)
  const results: ImportResult[] = [];

  // Preload IP yang disebut agar 1 query saja
  const wantedIps = [...new Set(rows.map((r) => r.ip_address ?? "").filter(Boolean))];
  const existingIps = wantedIps.length
    ? await prisma.ipAddress.findMany({ where: { address: { in: wantedIps } } })
    : [];
  const ipMap = new Map(existingIps.map((i) => [i.address, i]));
  // Deteksi duplikat IP di dalam file sendiri
  const seenIp = new Set<string>();

  let lastId = (await prisma.pelanggan.findFirst({ orderBy: { id: "desc" } }))?.id ?? 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx]!;
    const lineNo = idx + 2; // + header
    const nama = r.nama ?? "";
    const hp = r.hp ?? "";
    const alamat = r.alamat ?? "";
    const email = r.email ?? "";
    const tipe = (r.tipe ?? "rumahan").toLowerCase();
    const ipAddr = r.ip_address ?? "";

    if (nama.length < 3) {
      results.push({ row: lineNo, nama, status: "error", message: "nama minimal 3 karakter" });
      continue;
    }
    if (!HP_RE.test(hp)) {
      results.push({ row: lineNo, nama, status: "error", message: `hp tidak valid: ${hp}` });
      continue;
    }
    if (alamat.length < 5) {
      results.push({ row: lineNo, nama, status: "error", message: "alamat minimal 5 karakter" });
      continue;
    }
    if (!["rumahan", "bisnis", "dedicated"].includes(tipe)) {
      results.push({ row: lineNo, nama, status: "error", message: `tipe harus rumahan/bisnis/dedicated` });
      continue;
    }
    if (ipAddr) {
      if (!IPV4_RE.test(ipAddr) || !ipAddr.split(".").every((n) => Number(n) <= 255)) {
        results.push({ row: lineNo, nama, status: "error", message: `ip tidak valid: ${ipAddr}` });
        continue;
      }
      if (seenIp.has(ipAddr)) {
        results.push({ row: lineNo, nama, status: "error", message: `ip duplikat di file: ${ipAddr}` });
        continue;
      }
      seenIp.add(ipAddr);
      const found = ipMap.get(ipAddr);
      if (!found) {
        results.push({ row: lineNo, nama, status: "error", message: `ip ${ipAddr} belum ada di DB — tambah subnet dulu` });
        continue;
      }
      if (found.status === "assigned") {
        results.push({ row: lineNo, nama, status: "error", message: `ip ${ipAddr} sudah dipakai pelanggan #${found.pelangganId}` });
        continue;
      }
      if (found.status !== "available") {
        results.push({ row: lineNo, nama, status: "error", message: `ip ${ipAddr} status ${found.status}` });
        continue;
      }
    }

    if (dryRun) {
      results.push({ row: lineNo, nama, status: "ok", message: ipAddr ? `valid + ip ${ipAddr} available` : "valid" });
      continue;
    }

    // exec: buat pelanggan + assign IP dalam 1 transaksi
    try {
      lastId += 1;
      const kode = `CUS-${String(lastId).padStart(4, "0")}`;
      const created = await prisma.$transaction(async (tx) => {
        const p = await tx.pelanggan.create({
          data: {
            kode,
            nama,
            hp,
            alamat,
            email: email || undefined,
            tipe,
            status: "aktif",
          },
        });
        if (ipAddr) {
          const ip = await tx.ipAddress.findUnique({ where: { address: ipAddr } });
          if (!ip || ip.status !== "available") throw new Error(`ip ${ipAddr} tidak available saat eksekusi`);
          await tx.ipAddress.update({
            where: { address: ipAddr },
            data: { status: "assigned", pelangganId: p.id, tipe: "WAN", assignedAt: new Date(), assignedById: auth.user.id },
          });
          await tx.ipHistory.create({ data: { ipAddressId: ip.id, pelangganId: p.id, aksi: "assigned", byUserId: auth.user.id } });
        }
        return p;
      });
      ipMap.delete(ipAddr); // cegah assign ganda dalam batch yang sama
      // tandai assigned di map lokal
      if (ipAddr) {
        const cached = existingIps.find((i) => i.address === ipAddr);
        if (cached) cached.status = "assigned";
      }
      results.push({ row: lineNo, nama, status: "ok", message: ipAddr ? `dibuat + ip ${ipAddr}` : "dibuat", kode: created.kode });
    } catch (e) {
      lastId -= 1;
      results.push({ row: lineNo, nama, status: "error", message: (e as Error).message });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;

  if (!dryRun) {
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        aksi: "pelanggan.import",
        entity: "pelanggan",
        entityId: "csv",
        afterJson: { total: rows.length, ok, errors },
      },
    });
  }

  return NextResponse.json({ dry_run: dryRun, total: rows.length, ok, errors, results });
}
