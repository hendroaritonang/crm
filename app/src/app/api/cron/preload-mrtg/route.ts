import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMrtg } from "@/lib/mrtg";
import { fetchPrtg, parsePrtgAuth } from "@/lib/prtg";
import { decryptToken } from "@/lib/crypto";

// GET /api/cron/preload-mrtg — dipanggil cron sistem tiap 5 menit.
// Auth: header Authorization: Bearer <CRON_SECRET> ATAU ?secret=<CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ message: "CRON_SECRET belum diset" }, { status: 500 });

  const url = new URL(req.url);
  const given =
    req.headers.get("authorization")?.replace("Bearer ", "") ?? url.searchParams.get("secret") ?? "";
  if (given !== secret) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const targets = await prisma.mrtgTarget.findMany({
    where: { aktif: true, apiMode: { in: ["json", "prtg"] } },
    orderBy: { id: "asc" },
    take: 200,
  });

  let ok = 0;
  let failed = 0;
  for (const t of targets) {
    try {
      let token: string | undefined;
      if (t.authTokenEnc) {
        try {
          token = decryptToken(t.authTokenEnc);
        } catch {
          token = undefined;
        }
      }
      if (t.apiMode === "prtg") {
        await fetchPrtg(t.baseUrl, t.targetIdMrtg, "daily", parsePrtgAuth(token));
      } else {
        await fetchMrtg(t.baseUrl, t.targetIdMrtg, "daily", token);
      }
      ok++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ preloaded: ok, failed, total: targets.length, at: new Date().toISOString() });
}
