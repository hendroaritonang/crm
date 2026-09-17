// Proxy + cache untuk server MRTG existing.
// Alur: Route Handler CRM -> fetch ke MRTG (timeout 5s) -> cache 180s -> return JSON.
// Token MRTG TIDAK pernah dikirim ke browser.

type MrtgPoint = { timestamp: number; in_bps: number; out_bps: number };
type MrtgPayload = {
  target: string;
  updated_at: string;
  unit: string;
  data: MrtgPoint[];
  summary?: { current_in_bps: number; current_out_bps: number; avg_in_bps?: number; max_in_bps?: number };
  graph_url?: string;
};

const cache = new Map<string, { at: number; payload: MrtgPayload }>();
const TTL_MS = Number(process.env.MRTG_CACHE_TTL ?? 180) * 1000;
const TIMEOUT_MS = Number(process.env.MRTG_TIMEOUT_MS ?? 5000);

export async function fetchMrtg(
  baseUrl: string,
  targetId: string,
  period: string,
  token?: string
): Promise<{ payload: MrtgPayload; cached: boolean; stale: boolean }> {
  const key = `${targetId}:${period}`;
  const hit = cache.get(key);
  const now = Date.now();

  if (hit && now - hit.at < TTL_MS) {
    return { payload: hit.payload, cached: true, stale: false };
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/traffic?target=${encodeURIComponent(
    targetId
  )}&period=${encodeURIComponent(period)}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`MRTG ${res.status}`);
    const payload = (await res.json()) as MrtgPayload;
    cache.set(key, { at: now, payload });
    return { payload, cached: false, stale: false };
  } catch (e) {
    // fallback ke cache basi daripada error kosong
    if (hit) return { payload: hit.payload, cached: true, stale: true };
    throw e;
  }
}

export function clearMrtgCache(targetId?: string) {
  if (!targetId) return cache.clear();
  for (const k of cache.keys()) if (k.startsWith(`${targetId}:`)) cache.delete(k);
}
