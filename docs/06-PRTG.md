# Konek PRTG ke CRM ISP

CRM narik data historis langsung dari PRTG via `historicdata.json`, lalu tampil di grafik pelanggan (Harian/Mingguan/Bulanan/Tahunan). Token disimpan terenkripsi (AES-256-GCM), tidak pernah ke browser.

## 1. Buat user read-only di PRTG (5 menit)

1. Login PRTG sebagai admin → **Setup → System Administration → User Accounts → Add**.
2. Nama misal `crm-reader`, beri hak **Read-Only**, batasi ke group sensor pelanggan (jangan full admin).
3. Login sebagai `crm-reader` → **Setup → My Account Settings** → catat **Passhash** (string panjang).
   - PRTG versi baru: bisa pakai **API Token** (My Account → API Keys) — lebih aman karena bisa di-revoke.

## 2. Cari Sensor ID (per pelanggan / interface)

1. Buka sensor **SNMP Traffic** milik pelanggan (atau interface router-nya) di PRTG.
2. Lihat URL browser: `.../sensors.htm?id=2041...` → **2041** adalah Sensor ID.
3. Wajib tipe sensor **Traffic** (punya channel Traffic In/Out). Sensor Ping tidak ada datanya.

## 3. Hubungkan di CRM (2 menit per pelanggan)

1. Buka detail pelanggan → tab **Grafik MRTG**.
2. Sumber data: **PRTG (sensor ID)**.
3. Isi: IP pelanggan, **Sensor ID** (angka), **Base URL** (misal `https://192.168.1.10` — tanpa `/api`), username `crm-reader`, passhash/token.
4. Klik **Hubungkan** → grafik Harian langsung tampil. Ganti ke Mingguan/Bulanan/Tahunan untuk verifikasi.

## 4. Mapping periode

| CRM | PRTG avg | Rentang |
|-----|----------|---------|
| Harian | 5 menit | 24 jam terakhir |
| Mingguan | 1 jam | 7 hari |
| Bulanan | 1 hari | 30 hari |
| Tahunan | 1 hari | 365 hari |

## 5. Troubleshooting

| Gejala di CRM | Penyebab & solusi |
|---------------|-------------------|
| `Auth PRTG ditolak` | Username/passhash salah, atau user tidak punya akses read ke sensor itu. Tes manual: buka `https://PRTG/api/historicdata.json?id=2041&avg=300&sdate=2026-09-17-00-00-00&edate=2026-09-18-00-00-00&username=..&passhash=..` di browser — harus JSON, bukan login page. |
| `Timeout 15 dtk` | Firewall/VPN: pastikan VPS CRM bisa mencapai IP PRTG (coba `curl` dari VPS). Query tahunan pertama kali memang lambat. |
| Grafik kosong / 0 semua | Sensor bukan tipe Traffic, atau channel berbahasa non-Inggris yang tak dikenal. Cek `last_error` di tabel `mrtg_targets`, atau lihat raw JSON historicdata. |
| Error sertifikat / `fetch failed` | PRTG self-signed: set `PRTG_INSECURE=1` di `.env` CRM lalu `pm2 restart` (hanya untuk IP/host internal!). Jangka panjang: pasang sertifikat valid di PRTG. |
| Data tidak update | Jalankan cron preload tiap 5 menit (lihat `DEPLOY-VPS.md`), cek `last_fetched_at` di DB. |

## 6. Catatan keamanan

- User PRTG untuk CRM **read-only**, jangan pakai akun admin.
- Rotasi passhash/token berkala dari PRTG; setelah rotasi, link ulang dari CRM (token lama tertimpa).
- Semua request ke PRTG lewat proxy backend (`GET /api/mrtg/:id`), browser tidak pernah tahu kredensial PRTG.
