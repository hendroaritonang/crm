// Adapter PRTG Network Monitor (Paessler) → format grafik CRM.
// Pakai API: GET {base}/api/historicdata.json?id={sensorId}&avg={300|3600|86400}
//   &sdate={YYYY-MM-DD-HH-mm-ss}&edate=...&username=..&passhash=.. (atau &apitoken=..)
// Response PRTG: { histdata: [ { datetime, "Traffic In (speed) (raw)": n, ... } ] }
// Nilai (raw) sudah dalam bit/s. Kalau tidak ada, parse string "15.2 Mbit/s".

// PRTG on-prem sering self-signed cert → set PRTG_INSECURE=1 di .env (hanya untuk IP/host internal!)
if (process.env.PRTG_INSECURE === "1" && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export type PrtgPoint = { timestamp: number; in_bps: number; out_bps: number };
export type PrtgAuth = { username?: string; passhash?: string; apitoken?: string };

const PERIODS: Record<string, { seconds: number; avg: number }> = {
  daily: { seconds: 24 * 3600, avg: 300 },
  weekly: { seconds: 7 * 24 * 3600, avg: 3600 },
  monthly: { seconds: 30 * 24 * 3600, avg: 86400 },
  yearly: { seconds: 365 * 24 * 3600, avg: 86400 },
};

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

// "17.09.2026 10:05:00" (kadang dengan " - 10:10:00") → epoch detik
function parsePrtgTime(s: string): number {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return 0;
  return Math.floor(new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6])).getTime() / 1000);
}

const UNIT_MULT: [RegExp, number][] = [
  [/gbit\/s/i, 1e9],
  [/mbit\/s/i, 1e6],
  [/kbit\/s/i, 1e3],
  [/bit\/s/i, 1],
];

// Parse "15,2 Mbit/s" / "1,234 kbit/s" → bps. Koma = desimal (format PRTG ID/DE) atau ribuan.
function parseSpeed(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return 0;
  let mult = 1;
  for (const [re, m] of UNIT_MULT) {
    if (re.test(v)) {
      mult = m;
      break;
    }
  }
  let num = v.replace(/[^0-9.,]/g, "");
  // "1,234.56" → ribuan koma; "15,2" → desimal koma; "1.234,56" → desimal koma
  if (num.includes(",") && num.includes(".")) {
    if (num.lastIndexOf(",") > num.lastIndexOf(".")) num = num.replace(/\./g, "").replace(",", ".");
    else num = num.replace(/,/g, "");
  } else if (num.includes(",")) {
    const parts = num.split(",");
    num = parts.length === 2 && parts[1]!.length <= 2 ? num.replace(",", ".") : num.replace(/,/g, "");
  }
  const n = parseFloat(num);
  return Number.isFinite(n) ? n * mult : 0;
}

// Pilih channel In vs Out dari key PRTG (abaikan downtime & total)
function classify(key: string): "in" | "out" | null {
  const k = key.toLowerCase();
  if (k.includes("downtime")) return null;
  if (!k.includes("speed")) return null;
  if (k.includes("total")) return null;
  const hasIn = k.includes("traffic in") || k.includes(" in ") || k.startsWith("in ") || k.includes("(in)") || k.includes("down");
  const hasOut = k.includes("traffic out") || k.includes(" out ") || k.startsWith("out ") || k.includes("(out)") || k.includes(" up") || k.includes("up ");
  if (hasIn && !hasOut) return "in";
  if (hasOut && !hasIn) return "out";
  return null;
}

export async function fetchPrtg(
  baseUrl: string,
  sensorId: string,
  period: string,
  auth: PrtgAuth
): Promise<{ target: string; updated_at: string; unit: string; data: PrtgPoint[] }> {
  const cfg = PERIODS[period] ?? PERIODS.daily!;
  const end = new Date();
  const start = new Date(end.getTime() - cfg.seconds * 1000);

  const params = new URLSearchParams({
    id: sensorId,
    avg: String(cfg.avg),
    sdate: fmtDate(start),
    edate: fmtDate(end),
  });
  if (auth.apitoken) params.set("apitoken", auth.apitoken);
  else {
    if (auth.username) params.set("username", auth.username);
    if (auth.passhash) params.set("passhash", auth.passhash);
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/historicdata.json?${params.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  let json: { histdata?: Record<string, unknown>[]; error?: string };
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (res.status === 401 || res.status === 403)
      throw new Error("Auth PRTG ditolak (cek username/passhash/apitoken)");
    if (!res.ok) throw new Error(`PRTG HTTP ${res.status}`);
    json = (await res.json()) as typeof json;
  } catch (e) {
    clearTimeout(t);
    if ((e as Error).name === "AbortError") throw new Error("Timeout 15 dtk ke server PRTG");
    throw e;
  }
  if (json.error) throw new Error(`PRTG: ${json.error}`);
  const rows = json.histdata ?? [];

  const data: PrtgPoint[] = [];
  for (const row of rows) {
    const ts = parsePrtgTime(String(row.datetime ?? ""));
    if (!ts) continue;
    let inB = 0;
    let outB = 0;
    let inRaw = false;
    let outRaw = false;
    for (const [key, val] of Object.entries(row)) {
      if (key === "datetime") continue;
      const cls = classify(key);
      if (!cls) continue;
      const isRaw = key.toLowerCase().includes("(raw)");
      const bps = parseSpeed(val);
      if (cls === "in" && (!inRaw || isRaw)) {
        inB = bps;
        inRaw = inRaw || isRaw;
      }
      if (cls === "out" && (!outRaw || isRaw)) {
        outB = bps;
        outRaw = outRaw || isRaw;
      }
    }
    data.push({ timestamp: ts, in_bps: Math.round(inB), out_bps: Math.round(outB) });
  }

  return { target: sensorId, updated_at: new Date().toISOString(), unit: "bps", data };
}

// auth_token di DB bisa JSON {"username","passhash","apitoken"} atau string passhash lama
export function parsePrtgAuth(stored: string | null | undefined, fallbackUser?: string): PrtgAuth {
  if (!stored) return {};
  try {
    const o = JSON.parse(stored) as PrtgAuth;
    if (typeof o === "object") return o;
  } catch {
    // string biasa = passhash, username dari fallback
  }
  return fallbackUser ? { username: fallbackUser, passhash: stored } : { passhash: stored };
}
