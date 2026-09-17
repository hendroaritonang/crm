# Wireframe UI - CRM ISP (MVP)

> Bahasa: Indonesia. Layout: sidebar kiri + konten kanan. Mobile: sidebar jadi drawer. Chart: Chart.js. Warna status IP: hijau=available, biru=assigned, kuning=reserved, merah=blocked.

## 1. Navigasi global

```
+--------+------------------------------------------------+
| LOGO   | [Search global: nama / IP / ID]  [User v]      |
|--------|-----------------------------------------------|
| Dash   |                                               |
| Pelang |              KONTEN                         |
| IP     |                                               |
| MRTG   |                                               |
| Perang |                                               |
| Tiket  |                                               |
| Bill   |                                               |
| User   |                                               |
| Log    |                                               |
+--------+------------------------------------------------+
```

Search global: ketik `103.147.9.45` → dropdown: `IP → CUS-0101 Budi (Aktif) [Buka]`.

## 2. Dashboard

```
[842 Aktif] [12 Isolir] [910 IP Used / 1122 Free] [7 Tiket Open] [Rp168jt bln ini]

[Top 5 Bandwidth (auto-refresh 60s)]        [Tiket terbaru]
 CUS-0101 15.2 Mbps ▂▃▅▇                     T-0912 mati - progress
 CUS-0207 12.1 Mbps ▂▄▆                      T-0911 lambat - open
 ...                                          [Lihat semua]

[Pelanggan terbaru]                          [IP pool usage bar]
 CUS-0991 ...                                 Pool Publik 72% ██████░░
```

## 3. Pelanggan - List

```
[+ Tambah] [Import] [Export]  Filter: [Status v][Paket v]  Search: [____]
| Kode | Nama | HP | Paket | IP | Status | Trafik | Aksi |
| CUS-0101 | Budi | 0812.. | 20M | 103..45 | Aktif | 15.2M ▁▃▅ | [Detail] |
Klik baris → halaman detail.
```

## 4. Pelanggan - Detail (halaman terpenting)

```
Header: [CUS-0101] Budi Santoso  [Aktif]  Paket 20M Rp200rb
        081234567890 | Jl. Mawar 1 [Maps]   [Edit] [Buat Tiket] [Buat Invoice]

Tab: Info | IP (2) | Grafik MRTG | Tagihan (3) | Tiket (1) | Log

--- Tab IP ---
| 103.147.9.45 WAN [Unassign] [Link MRTG: linked v] |
| 192.168.10.45 LAN [Unassign]                      |
[+ Assign IP lain]

--- Tab Grafik MRTG ---
[Daily|Weekly|Monthly|Yearly]  update 2 mnt lalu [Refresh] [Buka di MRTG asli]
+--------------------------------------------------+
|  Grafik garis: In (hijau) / Out (biru)           |
|  Current: 15.2 / 3.4 Mbps  Avg: 12 / 2.8  Max: 21|
+--------------------------------------------------+
Empty: "Belum di-link ke MRTG [Link sekarang]"
Error: "MRTG tidak terjangkau, tampil data cache 15 mnt lalu [Retry]"

--- Tab Tagihan --- tabel invoice + [Tandai Lunas]
--- Tab Tiket --- [Buat Tiket] list + status
```

## 5. IP & Subnet

### 5.1 List Subnet
```
[+ Tambah Subnet]  Search [____]
| Nama | CIDR | Kategori | Used/Free | % | Aksi |
| Pool Publik 1 | 103.147.9.0/24 | publik | 180/74 | 71% ████ | [Lihat IP] |
```

### 5.2 Modal Tambah Subnet
```
Nama: [Pool Publik 2____]
CIDR: [103.147.10.0/24__] (validasi live: "254 host, tidak overlap")
Gateway: [103.147.10.1]  Kategori: ( ) publik ( ) privat ( ) management
VLAN: [___]  Deskripsi: [____]
[ Batal ] [ Simpan & Generate IP ]
```

### 5.3 List IP per Subnet
```
Subnet: Pool Publik 1  103.147.9.0/24   [71% used]  Filter: [All|Available|Assigned|Reserved|Blocked] Search [__]
| IP | Status | Pemilik | Tipe | MRTG | Aksi |
| .45 | Assigned | CUS-0101 Budi | WAN | linked | [Unassign] |
| .46 | Available | - | - | - | [Assign] |
Klik [Assign] → modal: pilih pelanggan (autocomplete) + tipe + hostname → [Simpan]
```

## 6. MRTG - Halaman global

```
Filter: [Perangkat v] [Pelanggan bdgededicated] Search [__]  [Hanya error]
| IP | Pelanggan | Interface | Current | Status fetch | Aksi |
| .45 | Budi | ether3 | 15.2M | ok 2 mnt lalu | [Grafik] [Refresh] |
Klik [Grafik] → drawer kanan dengan grafik daily + link ke detail pelanggan.
```

## 7. Tiket

```
[+ Buat Tiket] Filter status: [Open(7)|Progress|Resolved]
| No | Pelanggan/IP | Judul | Prioritas | Assignee | Umur | Aksi |
| T-0912 | CUS-0101 .45 | Mati total | urgent | Andi | 2 jam | [Proses] |
Detail tiket: info pelanggan + IP + grafik mini + timeline komentar + [Resolve dengan solusi].
```

## 8. Billing

```
Periode: [2026-09 v] Status: [Overdue(12)] [Generate Invoice bln ini] [Export]
| Invoice | Pelanggan | Jumlah | Jatuh tempo | Status | Aksi |
| INV/..0001 | Budi | Rp200rb | 10 Sep | overdue | [Lunas] [WA] |
Tombol [WA] = copy template teks WA manual (MVP).
```

## 9. States wajib (jangan lupa diimplementasi)

- Loading: skeleton bar untuk tabel + grafik (bukan spinner fullscreen).
- Empty: ilustrasi + CTA jelas.
- Error MRTG: banner kuning + data cache + tombol retry.
- Konfirmasi: modal untuk Unassign IP, Hapus Subnet, Hapus Pelanggan, Generate ulang invoice.
- Toast sukses/gagal tiap aksi assign/link/lunas.

## 10. Aturan UX

1. Assign IP selesai maksimal 3 klik dari list IP.
2. Dari search global ke grafik pelanggan maksimal 2 klik.
3. Semua ID (CUS-xxxx, T-xxxx, INV-xxxx) bisa diklik ke detail.
4. Format bandwidth otomatis: <1000 → Kbps, <1G → Mbps, else Gbps, 1 desimal.
5. Waktu relatif Indonesia: "2 menit lalu", tanggal `17 Sep 2026 10:02`.
