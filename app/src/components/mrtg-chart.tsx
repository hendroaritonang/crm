"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge, Btn, Card, CardHeader } from "@/components/ui";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const PERIODS = [
  { key: "daily", label: "Harian" },
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" },
  { key: "yearly", label: "Tahunan" },
] as const;

export function MrtgChart({ targetId }: { targetId: number }) {
  const [period, setPeriod] = useState<string>("daily");
  const [data, setData] = useState<{ timestamp: number; in_bps: number; out_bps: number }[]>([]);
  const [info, setInfo] = useState("");
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load(p: string) {
    setLoading(true);
    setInfo("Memuat…");
    try {
      const r = await fetch(`/api/mrtg/${targetId}?period=${p}`);
      const j = await r.json();
      if (j.data) {
        setData(j.data);
        setStale(!!j.stale);
        setInfo(`${j.ip ?? ""} · update ${j.fetched_at ? new Date(j.fetched_at).toLocaleString("id-ID") : "-"}`);
      } else if (j.api_mode === "png" && j.graph_url) {
        setData([]);
        setInfo("Mode gambar PNG");
      } else {
        setInfo(j.message ?? "Gagal memuat");
      }
    } catch {
      setInfo("MRTG tidak terjangkau");
    }
    setLoading(false);
  }

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, period]);

  const last = data[data.length - 1];
  const fmt = (bps: number) =>
    bps >= 1e9 ? `${(bps / 1e9).toFixed(2)} Gbps` : bps >= 1e6 ? `${(bps / 1e6).toFixed(1)} Mbps` : `${(bps / 1e3).toFixed(1)} Kbps`;

  return (
    <Card>
      <CardHeader
        title="Grafik Trafik"
        subtitle={info}
        actions={
          <>
            {stale && <Badge value="cache" />}
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${period === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Btn size="sm" onClick={() => load(period)} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></Btn>
          </>
        }
      />
      <div className="p-5">
        {stale && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            Server MRTG tidak terjangkau — menampilkan data cache terakhir.
          </p>
        )}
        {last && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Download (In)</p>
              <p className="text-xl font-bold text-emerald-700">{fmt(last.in_bps)}</p>
            </div>
            <div className="rounded-xl bg-sky-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">Upload (Out)</p>
              <p className="text-xl font-bold text-sky-700">{fmt(last.out_bps)}</p>
            </div>
          </div>
        )}
        {data.length > 0 ? (
          <Line
            data={{
              labels: data.map((d) => new Date(d.timestamp * 1000).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })),
              datasets: [
                { label: "In (download)", data: data.map((d) => d.in_bps), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,.08)", fill: true, tension: 0.3, pointRadius: 0 },
                { label: "Out (upload)", data: data.map((d) => d.out_bps), borderColor: "#0284c7", backgroundColor: "rgba(2,132,199,.08)", fill: true, tension: 0.3, pointRadius: 0 },
              ],
            }}
            options={{
              responsive: true,
              interaction: { mode: "index", intersect: false },
              plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
              scales: {
                x: { ticks: { maxTicksLimit: 8, font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { font: { size: 10 }, callback: (v) => fmt(Number(v)) }, grid: { color: "#f1f5f9" } },
              },
            }}
          />
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">Belum ada data grafik.</p>
        )}
      </div>
    </Card>
  );
}
