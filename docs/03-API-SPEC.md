# API Spec - CRM ISP (MVP)

Base URL: `https://crm.example.com/api`
Auth: `Authorization: Bearer <token>` (JWT / Sanctum). Semua endpoint kecuali login wajib auth + RBAC.
Format: JSON. Pagination: `?page=1&limit=20` → `{data:[], meta:{page,limit,total}}`.
Error: `{message, errors:{field:[msg]}}` dengan HTTP code standar.

---

## 1. Auth & Dashboard

### POST /auth/login
```json
// req
{"email":"admin@isp.id","password":"secret"}
// res 200
{"token":"...","user":{"id":1,"name":"Admin","role":"admin"}}
```

### GET /dashboard/summary
```json
{
  "pelanggan_aktif": 842, "pelanggan_isolir": 12,
  "ip_used": 910, "ip_free": 1122,
  "tiket_open": 7, "omzet_bulan_ini": 168400000,
  "top_talkers": [{"pelanggan":"CUS-0001","ip":"103.147.9.45","in_bps":15200000}],
  "tiket_terbaru": [], "pelanggan_terbaru": []
}
```

## 2. Pelanggan

- `GET /pelanggan?q=budi&status=aktif&paket_id=2&page=1` — search nama/kode/IP/HP/alamat (join ip_addresses)
- `POST /pelanggan`
```json
{"nama":"Budi","hp":"081234567890","alamat":"Jl. Mawar 1","paket_id":2,"tipe":"rumahan","tgl_jatuh_tempo":10}
```
- `GET /pelanggan/:id?include=ips,mrtg,invoices,tikets`
- `PUT /pelanggan/:id` — semua field + status transition validated
- `DELETE /pelanggan/:id` — soft delete, tolak jika masih ada invoice unpaid / IP assigned
- `POST /pelanggan/import` (multipart CSV) + `GET /pelanggan/export.xlsx`

Validasi: `hp` regex `^08[0-9]{8,11}$`, `tgl_jatuh_tempo` 1-28.

## 3. Subnet & IP (inti)

### POST /subnet
```json
{"nama":"Publik Pool 1","cidr":"103.147.9.0/24","gateway":"103.147.9.1","kategori":"publik","vlan_id":100}
```
- Backend: validasi CIDR, cek overlap, bulk generate host. Res 201: `{id, cidr, total:254, used:0, free:254}`
- Error 422 jika overlap: `{"message":"CIDR overlap dengan Publik Pool 1 (103.147.9.0/24)"}`

### GET /subnet / GET /subnet/:id/ips?status=available&q=9.45&page=1
```json
{"data":[{"id":45,"address":"103.147.9.45","status":"available","pelanggan":null}],"meta":{}}
```

### POST /ip/:id/assign
```json
// req
{"pelanggan_id":101,"tipe":"WAN","hostname":"budi-rumah","catatan":""}
 // res — 409 jika sudah assigned
{"id":45,"address":"103.147.9.45","status":"assigned","pelanggan_id":101}
```
- Transaksi DB: update `ip_addresses` + insert `ip_history(assigned)` + `audit_logs(ip.assign)`.
- Wajib cek `status='available'` dengan `SELECT ... FOR UPDATE`.

### POST /ip/:id/unassign `{ "alasan":"ganti paket" }`
### POST /ip/:id/reserve + POST /ip/:id/release + POST /ip (manual single IP)

## 4. Perangkat

- `GET /perangkat`, `POST /perangkat`, `PUT /perangkat/:id`
- `POST /perangkat/:id/test-koneksi` → `{ping_ms:2, snmp_sysname:"CCR-JKT-01", ok:true}`

## 5. MRTG Adapter (inti)

CRM tidak expose token MRTG ke browser. Semua via proxy backend dengan cache.

### 5.1 Kontrak ke server MRTG (yang harus disediakan server MRTG)

**Mode JSON (disarankan):**
```
GET {base_url}/api/traffic?target={target_id_mrtg}&period=daily|weekly|monthly|yearly
Header: Authorization: Bearer <token> (jika perlu)
```

Response wajib:
```json
{
  "target": "103.147.9.45",
  "updated_at": "2026-09-17T10:00:00Z",
  "unit": "bps",
  "data": [
    {"timestamp": 1726483200, "in_bps": 15200000, "out_bps": 3200000}
  ]
}
```
Opsional: `graph_url_daily/weekly/...`, `max_in_bps`, `max_out_bps`, `avg_in_bps`.

**Mode PNG (fallback MRTG lawas):**
- Simpan `png_url_template`, ex: `https://mrtg.local/graphs/{target}.day.png`
- Placeholder: `{target}`, `{period:day|week|month|year}`

### 5.2 Endpoint CRM (proxy + cache)

```
GET /mrtg/target?q=9.45              → list mapping
POST /mrtg/link                       → {ip_address_id, target_id_mrtg, perangkat_id, interface_name, api_mode, base_url}
GET /mrtg/:targetId?period=daily      → proxy response (di bawah)
POST /mrtg/:targetId/refresh          → bypass cache, force fetch
DELETE /mrtg/:targetId                → unlink
```

Response `GET /mrtg/:targetId?period=daily`:
```json
{
  "target_id": 12,
  "ip": "103.147.9.45",
  "pelanggan": {"id":101,"kode":"CUS-0101","nama":"Budi"},
  "period": "daily",
  "cached": true,
  "fetched_at": "2026-09-17T10:02:00Z",
  "stale": false,
  "summary": {"current_in_bps":15200000,"current_out_bps":3200000,"avg_in_bps":12000000,"max_in_bps":21000000},
  "data": [{"timestamp":1726483200,"in_bps":15200000,"out_bps":3200000}],
  "graph_url": "https://mrtg.local/graphs/xxx-day.png"
}
```

Jika MRTG down tapi cache ada:
```json
{"cached":true,"stale":true,"warning":"MRTG tidak dapat dijangkau, menampilkan data cache 15 menit lalu","data":[...]}
```
Jika down dan tidak ada cache: `502 {message:"MRTG unreachable", code:"MRTG_DOWN"}` — frontend tampilkan empty state + retry, bukan crash.

Aturan backend:
- Cache key `mrtg:{id}:{period}` TTL 180 detik (Redis). `stale` jika `now - fetched_at > 300s`.
- Timeout fetch 5 detik, retry 1x, simpan `last_error` ke `mrtg_targets`.
- Rate limit: 60 req/menit/user untuk endpoint MRTG.
- Cron tiap 5 menit preload target `aktif` milik pelanggan bisnis/dedicated.
- Frontend polling maksimal tiap 60 detik, bukan tiap detik.

### 5.3 Contoh .env MRTG
```
MRTG_DEFAULT_BASE_URL=https://mrtg.internal/api
MRTG_TIMEOUT_MS=5000
MRTG_CACHE_TTL=180
REDIS_URL=redis://localhost:6379
```

## 6. Tiket

- `GET /tiket?status=open&assignee_id=3`
- `POST /tiket {"pelanggan_id":101,"judul":"Internet lambat","kategori":"lambat","prioritas":"high"}`
- `PUT /tiket/:id {"status":"progress","assignee_id":3}`
- `POST /tiket/:id/komentar {"isi":"sudah restart ONT"}`
- `POST /tiket/:id/resolve {"solusi":"ganti channel wifi"}`

## 7. Billing

- `POST /invoice/generate {"periode":"2026-09"}` → skip yang sudah ada (`UNIQUE pelanggan+periode`), res `{created:95, skipped:5}`
- `GET /invoice?status=overdue&periode=2026-09`
- `POST /invoice/:id/lunas {"metode":"transfer","catatan":"BCA ..."}`
- `POST /invoice/:id/cancel`

## 8. User & Audit

- `GET /users`, `POST /users {"name","email","password","role"}`, `PUT /users/:id/role`, `POST /users/:id/nonaktif`
- `GET /audit?entity=ip&entity_id=45&page=1` (owner + admin saja)

## 9. Kode error standar

| Code | Arti |
|------|------|
| 400 | Request tidak valid |
| 401 | Belum login |
| 403 | Tidak punya izin (RBAC) |
| 404 | Data tidak ditemukan |
| 409 | Konflik (IP sudah assigned, invoice duplikat) |
| 422 | Validasi gagal (detail di `errors`) |
| 502 | MRTG unreachable (`MRTG_DOWN`) |
| 429 | Rate limit MRTG |

## 10. Contoh integrasi cepat (curl)

```bash
# 1. Login
curl -X POST https://crm.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@isp.id","password":"secret"}'

# 2. Tambah subnet
curl -X POST https://crm.example.com/api/subnet \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nama":"Pool 1","cidr":"103.147.9.0/24","kategori":"publik"}'

# 3. Assign IP id 45 ke pelanggan 101
curl -X POST https://crm.example.com/api/ip/45/assign \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"pelanggan_id":101,"tipe":"WAN"}'

# 4. Link MRTG lalu lihat grafik
curl -X POST https://crm.example.com/api/mrtg/link \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"ip_address_id":45,"target_id_mrtg":"103.147.9.45","api_mode":"json","base_url":"https://mrtg.internal/api"}'

curl "https://crm.example.com/api/mrtg/12?period=daily" -H "Authorization: Bearer $TOKEN"
```
