# UAT Checklist - CRM ISP MVP

> Jalankan berurutan dengan 50 data real (atau minimal 10). Tandai ✅ / ❌ + catat bug.

## Persiapan
- [ ] VPS/dev: `npm run build` hijau, `GET /api/health` → `{"ok":true,"db":"up"}`
- [ ] Login seed `owner@isp.local / admin123`, langsung ganti password + buat user admin & noc
- [ ] Siapkan: 1 subnet kecil uji (`192.168.99.0/24`), 1 contoh response MRTG real, file CSV 10 baris

## Skenario wajib (mapping acceptance PRD)
1. **Subnet** — Tambah `/24` → 254 host, status available. Coba duplikat CIDR → harus 409.
2. **Anti double-assign** — Assign 1 IP ke pelanggan A, coba assign lagi ke B → harus 409 + pesan jelas.
3. **Search IP** — Ketik IP di search pelanggan → pemilik + paket < 2 detik.
4. **Detail 6 tab** — Buka `/pelanggan/[id]`: Info edit tersimpan, IP assign/unassign, Grafik tampil Daily, Tagihan lunas, Tiket buat, Log tercatat.
5. **MRTG real** — Link 1 IP ke target real → grafik Daily/Weekly + current/avg. Matikan akses MRTG simulasi → banner cache, bukan 500.
6. **Billing** — Generate 1 periode (10-100 invoice) < 30 detik. Invoice duplikat periode sama → skip.
7. **Import CSV** — Dry-run file 10 baris (campur 2 baris error: HP salah + IP duplikat) → error tepat per baris. Eksekusi → hanya baris valid tersimpan.
8. **Role** — Login sebagai noc: tidak bisa tambah subnet/pelanggan (403), bisa update tiket + lihat grafik. Admin tidak bisa buka `/users` (403).
9. **Audit** — Setiap assign/unassign + create/update muncul di `/audit` dengan user benar.
10. **Password** — Ganti password salah lama → 401. Reset via owner → bisa login baru.

## Bug report format
`[Modul] Judul — langkah reproduksi — expected vs actual — akun role apa — screenshot/log`
