# CRM / Information System untuk ISP (Skala Kecil)

Satu sumber kebenaran untuk **Pelanggan, IP, dan Trafik MRTG**.
Dibuat untuk ISP kecil (< 1000 pelanggan) dengan tim kecil: Owner, Admin/CS, NOC/Teknisi.

> Status: **PRD + fondasi kode MVP selesai (Next.js fullstack, build hijau).**
> Kode ada di `app/`. Panduan deploy VPS ada di `app/DEPLOY-VPS.md`.

## Fitur MVP (V1.0)

- [x] Desain: Dashboard, CRM Pelanggan, IPAM (add IP/subnet + assign), MRTG via API
- [x] Desain: Perangkat/Router, Tiket gangguan, Billing sederhana, Role + Audit log
- [ ] Implementasi backend + frontend (4-6 minggu, 1-2 dev)

Dua fitur inti sesuai permintaan:
1. **Bisa add IP** — tambah subnet CIDR, auto-generate host, assign ke pelanggan, anti double-assign.
2. **Tampilan MRTG dari API** — grafik per IP/pelanggan (Daily/Weekly/Monthly/Yearly) via proxy backend + cache, bukan buka server MRTG terpisah.

Yang **tidak** masuk MVP: portal pelanggan, isolir otomatis Mikrotik, payment gateway, WA otomatis. Lihat roadmap di PRD.

## Struktur Dokumen

```
crm/
├── README.md                  ← kamu di sini
├── app/                       ← kode Next.js fullstack (BE+FE 1 repo)
│   ├── DEPLOY-VPS.md          ← panduan PM2 + Nginx tanpa Docker
│   ├── prisma/schema.prisma   ← 12 tabel MySQL
│   └── src/app/api/           ← health, auth, subnet, ip assign, mrtg proxy
└── docs/
    ├── PRD-CRM-ISP.md         ← PRD lengkap (scope, fitur, acceptance, roadmap)
    ├── 02-ERD.md              ← Skema DB + SQL DDL
    ├── 03-API-SPEC.md         ← REST API CRM + kontrak MRTG adapter + contoh curl
    └── 04-WIREFRAME.md        ← Wireframe UI tekstual per halaman
```

Baca berurutan: PRD → ERD → API Spec → Wireframe.

## Arsitektur Singkat

```
[Router] --SNMP--> [Server MRTG existing] --HTTP API (JSON/PNG)--> [CRM Backend proxy + cache] --> [CRM Web]
```

- CRM **tidak** polling SNMP sendiri di MVP, hanya konsumsi API MRTG.
- Token MRTG disimpan encrypted di backend, tidak pernah ke browser.
- Cache 2-5 menit (Redis). Kalau MRTG down, tampilkan cache + banner, CRM tetap jalan.

Rekomendasi stack final (dipakai di `app/`, tanpa Docker):
- **Backend + Frontend jadi satu:** Next.js 16 App Router + TypeScript (API via Route Handlers, UI SSR). Satu repo, satu build, satu proses PM2. Cocok tim kecil dan VPS tunggal.
- **DB:** MySQL 8 + Prisma ORM. Cache MRTG in-memory dulu (Redis opsional nanti).
- **Auth:** JWT (jose) + bcrypt. Grafik: Chart.js.
- **Deploy:** PM2 + Nginx reverse proxy + Certbot, detail di `app/DEPLOY-VPS.md`.

Kenapa bukan Laravel / NestJS terpisah: lokal ini tidak ada PHP (ada Node 24 + MySQL), dan backend-frontend terpisah berarti 2 deploy + 2 bahasa. Monolit Next.js paling murah dirawat untuk ISP kecil.

## Quickstart

```bash
# Dev lokal
cd app
cp .env.example .env   # isi DATABASE_URL, JWT_SECRET, MRTG_*
npm install
npx prisma db push
npm run db:seed        # owner@isp.local / admin123
npm run dev            # http://localhost:3000

# Build produksi (sudah terverifikasi hijau)
npm run build && npm start
```

Contoh alur pakai (MVP):
1. `IP & Subnet → Tambah Subnet → 103.147.9.0/24 → Simpan`
2. Klik IP available → `Assign → pilih CUS-0101 → Simpan`
3. Di detail pelanggan → `Link MRTG → target 103.147.9.45 → Test → Simpan`
4. Tab `Grafik` → verifikasi Daily jalan.

Contoh API cepat, lihat `docs/03-API-SPEC.md` bagian 10 (curl login, tambah subnet, assign, link MRTG).

## Kriteria MVP Lolos

1. Tambah `/24` → 254 host muncul benar.
2. Double-assign 1 IP ditolak (409 + pesan jelas).
3. Search IP → pemilik + grafik < 2 detik.
4. Grafik Daily/Weekly dari API real tampil + angka current/avg/max.
5. Simulasi MRTG mati → CRM tetap buka + banner cache.
6. Generate 100 invoice < 30 detik.
7. Semua assign/unassign tercatat di audit log.

## Roadmap

- **V1.0 MVP (4-6 minggu):** dokumen ini.
- **V1.1:** isolir Mikrotik otomatis + reminder WA + import rapi.
- **V2.0:** portal pelanggan + payment gateway + alert Telegram + inventaris ODP/ODC.

## Butuh dari Owner sebelum coding

1. 1 contoh response JSON + 1 contoh URL PNG MRTG existing.
2. Auth ke MRTG (token / basic / IP whitelist?) dan `target_id` berbasis apa.
3. Dump Excel pelanggan + IP existing (berapa subnet?).
4. Aturan billing: periode + toleransi overdue berapa hari.

## Kontribusi

- Ikuti kontrak di `03-API-SPEC.md`. Jangan ubah nama field tanpa update ERD + API spec.
- Setiap assign/unassign IP wajib tulis `ip_history` + `audit_logs`.
- Setiap endpoint MRTG wajib lewat proxy + cache, jangan panggil MRTG langsung dari frontend.
