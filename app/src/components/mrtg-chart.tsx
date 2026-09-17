"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function MrtgChart({ targetId }: { targetId: number }) {
  const [period, setPeriod] = useState("daily");
  const [data, setData] = useState<{ timestamp: number; in_bps: number; out_bps: number }[]>([]);
  const [info, setInfo] = useState("");

  useEffect(() => {
    setInfo("Memuat...");
    fetch(`/api/mrtg/${targetId}?period=${period}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setData(j.data);
          setInfo(`${j.ip ?? ""}${j.stale ? " (cache, MRTG unreachable)" : ""} update ${j.fetched_at ?? "-"}`);
        } else if (j.api_mode === "png" && j.graph_url) {
          setInfo("Mode PNG");
          setData([]);
        } else {
          setInfo(j.message ?? "Gagal memuat");
        }
      })
      .catch(() => setInfo("MRTG tidak terjangkau"));
  }, [targetId, period]);

  const last = data[data.length - 1];
  const fmt = (bps: number) =>
    bps >= 1e9 ? `${(bps / 1e9).toFixed(1)} Gbps` : bps >= 1e6 ? `${(bps / 1e6).toFixed(1)} Mbps` : `${(bps / 1e3).toFixed(1)} Kbps`;

  return (
    <div className="rounded border bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded px-3 py-1 text-sm ${period === p ? "bg-zinc-900 text-white" : "border"}`}
          >
            {p}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-500">{info}</span>
      </div>
      {last && (
        <div className="mb-2 text-sm">
          Current In <b>{fmt(last.in_bps)}</b> / Out <b>{fmt(last.out_bps)}</b>
        </div>
      )}
      {data.length > 0 && (
        <Line
          data={{
            labels: data.map((d) => new Date(d.timestamp * 1000).toLocaleTimeString("id-ID")),
            datasets: [
              { label: "In", data: data.map((d) => d.in_bps), borderColor: "#16a34a" },
              { label: "Out", data: data.map((d) => d.out_bps), borderColor: "#2563eb" },
            ],
          }}
          options={{ responsive: true, plugins: { legend: { display: true } } }}
        />
      )}
    </div>
  );
}
