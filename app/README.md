# CRM ISP — App (Next.js Fullstack)

Stack: **Next.js 16 App Router + TypeScript + Tailwind + Prisma (MySQL) + JWT (jose) + Chart.js**.
Deploy: **VPS tanpa Docker** via PM2 + Nginx. Lihat `DEPLOY-VPS.md`.

## Struktur

```
app/
├── prisma/schema.prisma      # 12 tabel (pelanggan, subnet, ip, mrtg, tiket, invoice...)
├── prisma/seed.ts            # owner@isp.local / admin123
├── src/app/
│   ├── login/                # login cookie httpOnly
│   ├── pelanggan/            # list + create + [id] 6 tab (info/ip/grafik/tagihan/tiket/log)
│   └── api/
│       ├── paket/            # GET list + POST (dropdown edit pelanggan)
│       ├── health/           # GET health + DB check
│       ├── auth/login|logout|me/ # cookie + Bearer
│       ├── dashboard/summary/ # kartu statistik
│       ├── pelanggan/        # GET search + POST + [id] GET/PUT/DELETE
│       ├── subnet/           # GET list + POST tambah CIDR + generate host
│       ├── ip/               # GET list filter + [id]/assign POST/DELETE
│       ├── mrtg/link         # GET list + POST link + [id] GET proxy / DELETE unlink
│       ├── tiket/            # GET + POST + [id] PUT status/komentar
│       └── invoice/          # GET + POST generate + [id]/lunas
├── src/lib/db.ts ip.ts mrtg.ts auth.ts
├── src/components/layout.tsx mrtg-chart.tsx
├── .env.example
└── ecosystem.config.js       # PM2
```

## Dev lokal

```bash
cd app
cp .env.example .env   # isi DATABASE_URL mysql lokal
npm install
npx prisma db push
npm run db:seed
npm run dev            # http://localhost:3000
```

## API yang sudah jalan (build hijau, auth cookie + Bearer)

- `GET /api/health`, `POST /api/auth/login|logout`, `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET/POST /api/pelanggan`, `GET/PUT/DELETE /api/pelanggan/:id`
- `GET/POST /api/subnet`, `GET /api/ip?subnetId&status&q`
- `POST/DELETE /api/ip/:id/assign` (assign transaction anti-double + unassign + history)
- `GET/POST /api/mrtg/link`, `GET/DELETE /api/mrtg/:id` (proxy + cache + unlink)
- `GET/POST /api/tiket`, `PUT /api/tiket/:id`
- `GET/POST /api/invoice` (generate per periode), `POST /api/invoice/:id/lunas`

- `GET /api/paket`, `GET /api/audit?entity&entity_id`, `GET /api/pelanggan/:id/history`
- `POST /api/pelanggan/import` (dry-run default + eksekusi, maks 500 baris, validasi IP available)
- `GET /api/pelanggan/export`, `GET /api/ip/export?subnetId=` (CSV)
- `GET /api/cron/preload-mrtg` (Bearer CRON_SECRET, hangatkan cache tiap 5 mnt)
- `GET/POST /api/users`, `PUT /api/users/:id` (owner saja: role, aktif, reset password)
- `PUT /api/auth/password` (ganti password sendiri)

Kontrak lengkap: `../docs/03-API-SPEC.md`.

## Next step (belum diimplementasikan)

1. Ping watchdog + alert Telegram saat trafik 0.
2. Portal pelanggan + payment gateway (Phase 2).
