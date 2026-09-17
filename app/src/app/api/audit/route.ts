import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/audit?entity=&entity_id=&q=&limit= — owner/admin saja
export async function GET(req: Request) {
  const auth = await requireApiUser(req, ["owner", "admin"]);
  if ("response" in auth) return auth.response;
  const sp = new URL(req.url).searchParams;
  const entity = sp.get("entity") ?? "";
  const entity_id = sp.get("entity_id") ?? "";
  const q = sp.get("q")?.trim() ?? "";
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? 50)));

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(entity ? { entity } : {}),
      ...(entity_id ? { entityId: entity_id } : {}),
      ...(q
        ? {
            OR: [
              { aksi: { contains: q } },
              { entity: { contains: q } },
              { entityId: { contains: q } },
              { user: { email: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { id: "desc" },
    take: limit,
  });
  return NextResponse.json({ data: rows });
}
