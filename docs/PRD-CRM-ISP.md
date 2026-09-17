# PRD - CRM / Information System untuk ISP (Skala Kecil)

**Versi:** 1.0 MVP Draft
**Tanggal:** 17 September 2026
**Status:** Draft untuk review
**Target:** ISP kecil (< 1000 pelanggan), tim kecil (Admin, NOC/Teknisi, Owner)

---

## 1. Latar Belakang dan Masalah

ISP kecil saat ini umumnya mengelola data dengan cara terpisah:
- Data pelanggan di Excel / WhatsApp
- Data IP di catatan manual / spreadsheet, rawan duplikat dan konflik
- Grafik trafik MRTG ada di server terpisah, tidak terhubung ke data pelanggan, sehingga NOC sulit korelasikan "IP ini milik siapa, trafiknya bagaimana"

Akibatnya: slow response gangguan, IP conflict, billing tidak akurat, tidak ada visibilitas tunggal.

## 2. Tujuan Produk

1. Satu sumber kebenaran (single source of truth) untuk Pelanggan, IP, dan Trafik.
2. Admin bisa **add IP / subnet, assign ke pelanggan** dalam < 1 menit tanpa duplikat.
3. NOC / Admin bisa **lihat grafik MRTG per pelanggan / per IP langsung dari CRM via API**, tanpa buka server MRTG terpisah.
4. Owner bisa lihat dashboard: total pelanggan aktif, IP terpakai, trafik top talkers, pelanggan bermasalah.

Indikator sukses MVP:
- 100% IP pelanggan tercatat di sistem (tidak ada di luar sistem)
- Waktu cek trafik pelanggan dari 5 menit (buka MRTG manual) menjadi < 30 detik
- 0 kasus double-assign IP setelah 1 bulan pakai

## 3. Target Pengguna dan Roles

| Role | Jumlah estimasi | Kebutuhan utama |
|------|-----------------|-----------------|
| **Super Admin / Owner** | 1-2 orang | Semua akses, laporan, manajemen user |
| **Admin / CS** | 1-3 orang | CRUD pelanggan, assign IP, input billing, buat tiket |
| **NOC / Teknisi** | 1-3 orang | Lihat MRTG, status perangkat, update tiket gangguan |
| **Pelanggan (Phase 2, opsional)** | - | Lihat tagihan dan grafik sendiri (tidak wajib di MVP) |

MVP hanya untuk internal. Portal pelanggan masuk Phase 2.

## 4. Ruang Lingkup MVP vs Non-MVP

### 4.1 Wajib di MVP (V1.0)
1. Dashboard ringkas
2. Manajemen Pelanggan (CRM)
3. Manajemen IP & Subnet (IPAM sederhana)
4. Integrasi MRTG via API + tampilan grafik
5. Manajemen Perangkat / Router (minimal untuk mapping MRTG)
6. Ticketing gangguan sederhana
7. Billing sederhana (invoice manual + status lunas)
8. Manajemen user dan audit log

### 4.2 Tidak masuk MVP (Phase 2)
- Portal pelanggan / mobile app
- Isolir otomatis via Mikrotik API / PPPoE suspend
- Payment gateway (Midtrans/Xendit), reminder WA otomatis
- Multi-cabang, multi-gudang ODP/ODC detail
- NetFlow / sFlow / MRTG replacement dengan polling SNMP sendiri
- Export pajak / akuntansi penuh

## 5. Kebutuhan Fungsional Detail

### F-01 Dashboard
- Kartu statistik: Total Pelanggan Aktif / Nonaktif / Isolir, Total IP Used / Free, Tiket Open, Pendapatan bulan ini
- Tabel: 5 Top Bandwidth (dari MRTG API), 5 Tiket terbaru, 5 Pelanggan terbaru
- Filter periode: Hari ini / 7 hari / 30 hari
- Auto-refresh 60 detik untuk widget MRTG top talkers (cache, bukan hit API tiap detik)

### F-02 Manajemen Pelanggan (CRM)
Field pelanggan:
- ID Pelanggan auto (ex: `CUS-0001`), Nama, tipe (Rumahan / Bisnis / Dedicated), NIK/KTP opsional, HP/WA wajib, Email, Alamat lengkap + titik koordinat (lat/long, link maps), Paket (relasi ke tabel paket), Harga, Tanggal install, Tanggal jatuh tempo, Status: `prospek | aktif | nonaktif | isolir | berhenti`, Teknisi instalasi, Catatan

Fungsi:
- CRUD + pencarian (nama, ID, IP, HP, alamat)
- Filter status, paket, area
- Detail pelanggan satu halaman berisi tab: Info, IP & Perangkat, Grafik MRTG, Tagihan, Tiket, Aktivitas
- Import CSV + Export Excel
- Soft delete, semua perubahan tercatat di audit log
- Validasi: No HP format Indonesia, 1 pelanggan bisa punya >1 IP (contoh: 1 private + 1 publik)

### F-03 Manajemen Paket
- CRUD paket: Nama (ex: 20 Mbps Rumahan), Bandwidth up/down, Harga, Tipe
- Dipakai sebagai dropdown saat tambah pelanggan

### F-04 Manajemen IP & Subnet (IPAM Sederhana) — FITUR INTI
Kebutuhan user: "bisa add IP"

1. **Kelola Subnet:**
   - Add subnet dengan CIDR (ex: `103.147.9.0/24`, `192.168.10.0/24`)
   - Field: Nama, CIDR, Router/Gateway, VLAN ID opsional, Deskripsi, Kategori (Publik / Privat / Management)
   - Sistem auto-generate semua host IP di subnet + hitung: total, used, free, reserved
   - Validasi CIDR overlap tidak boleh (ex: tidak bisa tambah `103.147.9.0/25` kalau `/24` sudah ada tanpa konfirmasi)
   - Hapus subnet hanya jika tidak ada IP yang ter-assign

2. **Kelola IP:**
   - List IP per subnet dengan status warna: `available (hijau) | assigned/used (biru) | reserved (kuning) | blocked/bogus (merah)`
   - Add single IP manual + bulk add (paste list / import CSV)
   - Assign IP ke pelanggan: pilih IP available -> pilih pelanggan -> pilih tipe (WAN / LAN / Management / Dedicated) -> simpan
   - Unassign / ganti IP dengan riwayat (siapa, kapan, kenapa)
   - Cegah double-assign di level database (unique constraint `ip_address WHERE status != available`)
   - Pencarian cepat: ketik `103.147.9.45` langsung ketemu pemiliknya
   - Field IP: address, subnet_id, status, pelanggan_id (nullable), perangkat_id (nullable), fqdn/hostname, last_seen (dari ping/SNMP opsional), catatan

3. **Aturan bisnis:**
   - 1 IP aktif hanya milik 1 pelanggan aktif dalam satu waktu
   - IP yang masih menempel ke pelanggan aktif tidak bisa dihapus, harus unassign dulu
   - Semua assign/unassign masuk audit log + history IP

User story prioritas:
- Sebagai Admin, saya tambah subnet `/24` lalu langsung lihat 254 IP available
- Sebagai Admin, saya klik IP -> Assign -> pilih pelanggan -> selesai < 30 detik
- Sebagai NOC, saya search IP dari komplain dan langsung tahu pelanggan + paket + grafiknya

### F-05 Manajemen Perangkat / Router (pendukung MRTG)
Field: Nama (ex: CCR-JKT-01), Tipe (Mikrotik / Cisco / OLT), IP management, Lokasi/POP, SNMP community (encrypted), API credential (encrypted), Status online/offline
Fungsi: CRUD + tombol "Test Koneksi" (ping + SNMP get sysName). Data ini dipakai untuk mapping target MRTG.

### F-06 Integrasi dan Tampilan MRTG via API — FITUR INTI

Asumsi realistis untuk ISP kecil: **sudah ada server MRTG** (atau LibreNMS/Cacti/Mikrotik) yang bisa expose data. CRM tidak polling SNMP sendiri di MVP, hanya jadi konsumen API.

**Arsitektur:**
```
[Router] --SNMP--> [Server MRTG existing] --HTTP API (JSON/PNG)--> [CRM Backend proxy + cache] --> [CRM Frontend grafik]
```

**Kontrak API MRTG yang didukung (adapter pattern):**
CRM wajib dukung 2 mode, bisa dipilih per perangkat:
- **Mode A - Generic HTTP (disarankan):** `GET {MRTG_BASE_URL}/api/traffic?target={target_id}&period=daily|weekly|monthly|yearly` return JSON:
```json
{
  "target": "103.147.9.45",
  "updated_at": "2026-09-17T10:00:00Z",
  "unit": "bps",
  "data": [
    {"timestamp": 1726483200, "in_bps": 15200000, "out_bps": 3200000},
    {"timestamp": 1726483500, "in_bps": 16100000, "out_bps": 3400000}
  ],
  "graph_url_daily": "https://mrtg.example.com/graphs/xxx-daily.png",
  "graph_url_weekly": "https://mrtg.example.com/graphs/xxx-weekly.png"
}
```
- **Mode B - PNG Embed (fallback):** jika server MRTG lama hanya hasilkan PNG, CRM simpan `png_url_template` ex: `https://mrtg.example.com/{target}.day.png` dan tampilkan via `<img>` + proxy agar tidak CORS / expose credential.

**Mapping:**
- Tabel `mrtg_targets`: `id, pelanggan_id nullable, ip_address, perangkat_id, interface_name (ex: ether3 / vlan100), target_id (ID di sisi MRTG), api_mode, base_url, auth_token encrypted, refresh_interval, aktif`
- Saat assign IP ke pelanggan, ada tombol "Link ke MRTG target" (pilih target_id atau auto by IP)
- 1 IP bisa link ke 1 target aktif (1-to-1 untuk MVP agar tidak bingung)

**Tampilan di CRM:**
- Di detail pelanggan tab Grafik: time-range switcher Daily/Weekly/Monthly/Yearly, grafik line In/Out (Chart.js / Recharts), angka current/average/max, timestamp "update 2 menit lalu", tombol Refresh + link "Buka di MRTG asli"
- Di list pelanggan: sparkline mini + badge trafik saat ini (ex: 15.2 Mbps)
- Di dashboard: Top 5 bandwidth
- Jika API down: tampilkan grafik terakhir dari cache + banner "Data cache, MRTG tidak dapat dijangkau" (jangan blank)

**Backend:**
- Endpoint CRM me-proxy ke MRTG: `GET /api/mrtg/:targetId?period=daily` agar token MRTG tidak expose ke browser
- Cache Redis / memory 2-5 menit per target+period
- Timeout 5 detik, retry 1x, log error
- Job cron tiap 5 menit preload target prioritas (pelanggan dedicated/bisnis)

**Keamanan:**
- Token MRTG simpan encrypted (APP_KEY / vault), tidak pernah dikirim ke frontend
- Akses grafik cek otorisasi: user harus punya akses ke pelanggan tersebut

### F-07 Ticketing Gangguan Sederhana
Field: No tiket auto, pelanggan, judul, kategori (Internet mati / Lambat / Ganti password / Instalasi), prioritas, status (`open | progress | resolved | closed`), assignee teknisi, kronologi chat/komentar, SLA sederhana
Fungsi: buat dari halaman pelanggan 1 klik (auto isi pelanggan+IP), assign, update status, tutup dengan solusi. Notifikasi WA manual (copy template) untuk MVP.

### F-08 Billing Sederhana
- Tabel paket + generate invoice bulanan 1 klik per periode
- Invoice: No, pelanggan, periode, jumlah, jatuh tempo, status (`unpaid | paid | overdue`), metode bayar manual
- Tandai lunas manual, filter overdue, export
- Tidak ada payment gateway di MVP

### F-09 User, Role, Audit Log
- Roles: owner (all), admin, noc. Matrix izin sederhana di PRD lampiran
- Login email+password, session timeout, ganti password
- Audit log: siapa, kapan, aksi, objek (ex: assign IP 103.x ke CUS-0001). Tidak bisa dihapus user biasa, retensi 1 tahun

## 6. Alur Utama (User Flows)

**Flow 1 - Tambah pelanggan + IP + MRTG (happy path):**
1. Admin > Pelanggan > Tambah > isi form > simpan -> dapat ID CUS-00xx
2. Admin > IP > pilih subnet > klik IP available > Assign > pilih CUS-00xx > simpan
3. Admin > di detail pelanggan > Link MRTG > pilih target / auto by IP > Test > simpan
4. NOC > buka detail pelanggan > tab Grafik > lihat Daily, verifikasi trafik jalan
5. Selesai < 3 menit

**Flow 2 - Komplain lambat:**
1. CS search IP / nama -> buka detail -> lihat grafik (apakah full? kosong?)
2. Jika grafik abnormal -> Buat Tiket 1 klik -> assign teknisi
3. Teknisi update progress -> resolve -> CS konfirmasi ke pelanggan

**Flow 3 - Tambah subnet baru:**
1. Admin > Subnet > Tambah CIDR > validasi overlap > simpan
2. Sistem generate host list, tampilkan ringkasan used/free
3. Siap di-assign

## 7. Model Data (MVP, relasional)

```
users(id, name, email unique, password_hash, role, aktif)
pakets(id, nama, down_mbps, up_mbps, harga, aktif)
pelanggans(id, kode unique CUS-xxxx, nama, tipe, hp, email, alamat, lat, long, paket_id FK, status, tgl_install, tgl_jatuh_tempo, catatan, deleted_at)
subnets(id, nama, cidr unique, gateway, kategori, vlan, deskripsi)
ip_addresses(id, address unique, subnet_id FK, status enum, pelanggan_id FK nullable, perangkat_id FK nullable, hostname, catatan, assigned_at, assigned_by)
perangkats(id, nama, tipe, ip_mgmt, lokasi, snmp_community_enc, api_cred_enc, status)
mrtg_targets(id, ip_address_id FK unique, pelanggan_id FK, perangkat_id FK, interface_name, target_id_mrtg, api_mode, base_url, aktif, last_fetched_at)
mrtg_cache(target_id FK, period, payload_json, fetched_at) // atau Redis
tikets(id, no_tiket unique, pelanggan_id FK, judul, kategori, prioritas, status, assignee_id FK, solusi, timestamps)
invoices(id, no_invoice unique, pelanggan_id FK, periode, jumlah, jatuh_tempo, status, paid_at, metode)
audit_logs(id, user_id, aksi, entity, entity_id, before_json, after_json, created_at)
```

Constraint penting:
- `ip_addresses.address UNIQUE`
- `mrtg_targets.ip_address_id UNIQUE WHERE aktif=true`
- Tidak bisa hapus subnet/pelanggan yang masih punya relasi aktif (restrict, wajib unassign dulu)

## 8. API Internal CRM (REST, JSON)

```
POST   /api/auth/login
GET    /api/dashboard/summary

GET    /api/pelanggan?q=&status=&page=
POST   /api/pelanggan
GET    /api/pelanggan/:id  (include=ips,mrtg,invoices,tikets)
PUT    /api/pelanggan/:id

GET    /api/subnet
POST   /api/subnet {cidr, nama, ...}
GET    /api/subnet/:id/ips?status=available&q=
POST   /api/ip {address, subnet_id}
POST   /api/ip/:id/assign {pelanggan_id, tipe}
POST   /api/ip/:id/unassign {alasan}
POST   /api/ip/:id/reserve

GET    /api/perangkat
POST   /api/perangkat/:id/test-koneksi

GET    /api/mrtg/target?q=
POST   /api/mrtg/link {ip_address_id, target_id_mrtg, ...}
GET    /api/mrtg/:targetId?period=daily|weekly|monthly|yearly  (proxy+cache)
POST   /api/mrtg/:targetId/refresh

GET    /api/tiket?status=open
POST   /api/tiket
PUT    /api/tiket/:id

GET    /api/invoice?status=overdue&periode=2026-09
POST   /api/invoice/generate {periode}
POST   /api/invoice/:id/lunas
```

Standar: pagination `page/limit`, format error `{message, errors}`, auth Bearer JWT / session, rate-limit untuk endpoint MRTG.

## 9. UI/UX Requirements

- Web responsive, mobile-friendly, sidebar: Dashboard, Pelanggan, IP & Subnet, Perangkat, MRTG, Tiket, Billing, User, Log
- Bahasa Indonesia
- Halaman IP: tabel virtualized (mampu render /24 = 254 baris lancar, siap /22 = 1022 baris dengan pagination), filter status 1 klik, warna status jelas, aksi Assign/Unassign inline
- Halaman grafik: skeleton loading, empty state jelas ("Belum di-link ke MRTG"), error state dengan tombol retry
- Aksesibilitas dasar: kontras cukup, semua aksi penting bisa via keyboard, konfirmasi untuk aksi destruktif
- Chart library: Chart.js / Recharts, format bps otomatis (Kbps/Mbps/Gbps)

Contoh layout Detail Pelanggan:
```
Header: [CUS-0001] Budi - Aktif - Paket 20M - [Edit] [Buat Tiket] [Lihat Invoice]
Tab: Info | IP (2) | Grafik MRTG | Tagihan (3) | Tiket (1) | Log
Tab Grafik: [Daily|Weekly|Monthly|Yearly] [Refresh] update 2 mnt lalu
            [Grafik In Hijau / Out Biru] Current: 15.2/3.4 Mbps Avg:.. Max:..
```

## 10. Non-Functional Requirements

- Performa: list 1000 pelanggan < 2 detik, grafik load < 3 detik (dengan cache), tabel IP /24 render < 1 detik
- Ketersediaan: target 99% internal, MRTG down tidak boleh bikin CRM down (degrade gracefully)
- Keamanan: password hash bcrypt, token MRTG encrypted at rest, RBAC, audit log, proteksi SQLi/XSS/CSRF standar framework, backup DB harian otomatis + retensi 7 hari
- Skalabilitas MVP: dukung 2000 pelanggan, 8 subnet /24, 2000 MRTG target (dengan cache), siap naik tanpa refactor besar
- Browser: Chrome/Edge terbaru + Firefox
- Deploy: 1 VPS cukup untuk MVP (CRM + DB + cache), MRTG tetap di server existing

## 11. Rekomendasi Teknologi (cepat + murah untuk ISP kecil)

**Opsi A - Disarankan (paling cepat dibangun):**
- Frontend: Next.js (React) + Tailwind + shadcn/ui + Chart.js
- Backend: Laravel 11 (PHP) atau NestJS — pilih yang tim bisa. Laravel lebih cepat untuk CRUD + RBAC + import Excel
- DB: PostgreSQL (atau MySQL jika sudah familiar), Redis untuk cache MRTG
- Deploy: VPS + Docker Compose + Nginx + HTTPS Let's Encrypt

**Opsi B - Single codebase tercepat:**
- Laravel + Blade/Livewire + Tailwind (tanpa SPA terpisah). Grafik tetap Chart.js. Cocok jika hanya 1 developer.

Jangan bangun polling SNMP sendiri di MVP. Fokus ke integrasi API.

Estimasi kasar (1-2 dev):
- Minggu 1-2: Auth, Pelanggan, Paket, Subnet/IP CRUD + assign
- Minggu 3: Integrasi MRTG proxy+cache + grafik
- Minggu 4: Tiket + Billing sederhana + Dashboard + hardening + UAT
Total: ~4-6 minggu untuk MVP layak pakai.

## 12. Kriteria Penerimaan (Acceptance Criteria MVP)

1. Admin bisa tambah subnet `/24` dan sistem menampilkan 254 host dengan status benar
2. Tidak mungkin assign 1 IP ke 2 pelanggan aktif (diuji coba double-assign, harus ditolak dengan pesan jelas)
3. Search IP mengembalikan pemilik + paket dalam < 2 detik
4. Detail pelanggan menampilkan grafik MRTG Daily/Weekly dari API real (bukan dummy) dengan angka current/avg/max
5. Saat server MRTG dimatikan simulasi, CRM tetap bisa dibuka dan menampilkan banner cache, bukan error 500
6. Generate 100 invoice bulanan dalam 1 aksi < 30 detik
7. Audit log mencatat semua assign/unassign IP
8. UAT dengan 50 data pelanggan real lolos tanpa bug kritis

## 13. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Format API MRTG beda-beda tiap router/server | Integrasi molor | Wajibkan adapter pattern (Mode A/B), buat 1 contoh connector dulu, dokumentasikan kontrak JSON |
| Data IP existing berantakan / duplikat | Import gagal | Sediakan script validasi + dry-run import, laporan duplikat sebelum insert |
| MRTG lambat / timeout | UI lemot | Proxy + cache 2-5 mnt + preload cron, timeout 5 dtk |
| Kredensial SNMP/API bocor | Keamanan | Encrypt at rest, tidak kirim ke frontend, mask di UI |
| Scope creep (minta isolir otomatis, portal, dll) | MVP molor | Kunci scope di Bab 4, sisanya ke Phase 2 dengan roadmap jelas |

## 14. Roadmap Phase 2 (setelah MVP stabil)

1. Integrasi Mikrotik API: isolir/suspend otomatis jika invoice overdue X hari
2. Reminder WA otomatis (Wablas/Fonnte) H-3, H+1, H+7
3. Payment gateway + portal pelanggan (cek tagihan, bayar, lihat grafik sendiri)
4. Monitoring lanjutan: ping watchdog, SNMP poller sendiri, alert Telegram jika trafik 0 / loss
5. Inventaris ODP/ODC, kabel, stok ONT

## 15. Pertanyaan Terbuka (perlu dijawab sebelum coding)

1. URL + format API MRTG existing seperti apa? (minta 1 contoh response JSON + 1 contoh URL PNG)
2. Butuh autentikasi apa ke MRTG? (basic auth / token / IP whitelist?)
3. Penamaan `target_id` di MRTG berbasis apa? (IP? ifIndex? interface name?)
4. Data pelanggan + IP existing dalam format apa? (Excel? Mikrotik export? ada berapa subnet?)
5. Billing: periode tanggal berapa? Denda isolir setelah berapa hari overdue?

---

**Lampiran A - Matrix Role Sederhana:**
- Owner: semua
- Admin: CRUD pelanggan/IP/paket/invoice/tiket, tidak bisa hapus subnet, tidak bisa kelola user
- NOC: read pelanggan/IP/grafik, update tiket, tidak bisa edit billing/hapus

**Lampiran B - Contoh Template WA Manual (MVP):**
`Halo {nama} ({id}), tagihan {periode} Rp{jumlah} jatuh tempo {tgl}. Cek detail: {link}. Terima kasih.`
