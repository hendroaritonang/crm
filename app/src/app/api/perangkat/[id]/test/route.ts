import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const execFileAsync = promisify(execFile);

// POST /api/perangkat/[id]/test — ping 2x, update status online/offline
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const dev = await prisma.perangkat.findUnique({ where: { id: Number(id) } });
  if (!dev) return NextResponse.json({ message: "Perangkat tidak ditemukan" }, { status: 404 });
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(dev.ipMgmt))
    return NextResponse.json({ message: "IP management tidak valid" }, { status: 422 });

  const started = Date.now();
  try {
    await execFileAsync("ping", ["-c", "2", "-W", "2", dev.ipMgmt], { timeout: 8000 });
    const latency = Date.now() - started;
    await prisma.perangkat.update({
      where: { id: dev.id },
      data: { status: dev.status === "maintenance" ? "maintenance" : "online" },
    });
    return NextResponse.json({ ok: true, latency_ms: latency, ip: dev.ipMgmt });
  } catch {
    await prisma.perangkat.update({ where: { id: dev.id }, data: { status: "offline" } });
    return NextResponse.json(
      { ok: false, message: `${dev.ipMgmt} tidak menjawab ping (timeout 8 dtk)`, ip: dev.ipMgmt },
      { status: 502 }
    );
  }
}
