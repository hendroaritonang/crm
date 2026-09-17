# ERD Detail - CRM ISP (MVP)

> Pendamping dari `PRD-CRM-ISP.md` Bab 7. DBMS target: PostgreSQL 15+ (kompatibel MySQL 8 dengan penyesuaian minor).

## 1. Diagram Relasi (teks)

```
users 1---N audit_logs
users 1---N tikets (as assignee)
users 1---N ip_addresses (as assigned_by)

pakets 1---N pelanggans
pelanggans 1---N ip_addresses
pelanggans 1---N mrtg_targets
pelanggans 1---N tikets
pelanggans 1---N invoices
pelanggans 1---N ip_history

subnets 1---N ip_addresses
perangkats 1---N ip_addresses
perangkats 1---N mrtg_targets

ip_addresses 1---0/1 mrtg_targets (aktif)
mrtg_targets 1---N mrtg_cache (atau Redis)
tikets 1---N tiket_komentars
```

Aturan:
- 1 IP aktif hanya milik 1 pelanggan. Enforced via `UNIQUE(address)` + check aplikasi + `partial unique` untuk mrtg.
- Hapus pelanggan = soft delete. Hapus subnet = restrict jika masih ada IP assigned.
- Semua assign/unassign wajib tulis ke `ip_history` + `audit_logs`.

## 2. Definisi Tabel + SQL DDL

### 2.1 users
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner','admin','noc')),
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 pakets
```sql
CREATE TABLE pakets (
  id BIGSERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL, -- ex: 20 Mbps Rumahan
  down_mbps INT NOT NULL,
  up_mbps INT NOT NULL,
  harga INT NOT NULL, -- rupiah, tanpa titik
  tipe VARCHAR(20) DEFAULT 'rumahan' CHECK (tipe IN ('rumahan','bisnis','dedicated')),
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.3 pelanggans
```sql
CREATE TABLE pelanggans (
  id BIGSERIAL PRIMARY KEY,
  kode VARCHAR(20) NOT NULL UNIQUE, -- CUS-0001, generate di app
  nama VARCHAR(150) NOT NULL,
  tipe VARCHAR(20) NOT NULL DEFAULT 'rumahan',
  hp VARCHAR(20) NOT NULL, -- validasi 08xx
  email VARCHAR(150),
  alamat TEXT NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  paket_id BIGINT REFERENCES pakets(id),
  status VARCHAR(20) NOT NULL DEFAULT 'prospek'
    CHECK (status IN ('prospek','aktif','nonaktif','isolir','berhenti')),
  tgl_install DATE,
  tgl_jatuh_tempo INT DEFAULT 10, -- tanggal 1-28
  catatan TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pelanggan_status ON pelanggans(status);
CREATE INDEX idx_pelanggan_nama ON pelanggans(nama);
CREATE INDEX idx_pelanggan_hp ON pelanggans(hp);
```

### 2.4 subnets
```sql
CREATE TABLE subnets (
  id BIGSERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL, -- ex: Publik-CGNAT-01
  cidr CIDR NOT NULL UNIQUE, -- pakai tipe CIDR Postgres, di MySQL pakai VARCHAR + validasi app
  gateway INET,
  kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('publik','privat','management')),
  vlan_id INT,
  deskripsi TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 ip_addresses (inti)
```sql
CREATE TABLE ip_addresses (
  id BIGSERIAL PRIMARY KEY,
  address INET NOT NULL UNIQUE,
  subnet_id BIGINT NOT NULL REFERENCES subnets(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','assigned','reserved','blocked')),
  pelanggan_id BIGINT REFERENCES pelanggans(id) ON DELETE RESTRICT,
  perangkat_id BIGINT REFERENCES perangkats(id) ON DELETE SET NULL,
  tipe VARCHAR(20) CHECK (tipe IN ('WAN','LAN','management','dedicated')),
  hostname VARCHAR(150),
  catatan TEXT,
  assigned_at TIMESTAMPTZ,
  assigned_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_assign CHECK (
    (status = 'assigned' AND pelanggan_id IS NOT NULL) OR
    (status != 'assigned')
  )
);
CREATE INDEX idx_ip_status ON ip_addresses(status);
CREATE INDEX idx_ip_pelanggan ON ip_addresses(pelanggan_id);
CREATE INDEX idx_ip_subnet ON ip_addresses(subnet_id);
```

### 2.6 ip_history (riwayat assign)
```sql
CREATE TABLE ip_history (
  id BIGSERIAL PRIMARY KEY,
  ip_address_id BIGINT NOT NULL REFERENCES ip_addresses(id) ON DELETE CASCADE,
  pelanggan_id BIGINT REFERENCES pelanggans(id) ON DELETE SET NULL,
  aksi VARCHAR(20) NOT NULL CHECK (aksi IN ('assigned','unassigned','reserved','released','blocked')),
  alasan TEXT,
  by_user BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_iphistory_ip ON ip_history(ip_address_id);
```

### 2.7 perangkats
```sql
CREATE TABLE perangkats (
  id BIGSERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL, -- CCR-JKT-01
  tipe VARCHAR(30) NOT NULL, -- mikrotik, cisco, olt, switch
  ip_mgmt INET NOT NULL,
  lokasi VARCHAR(150),
  snmp_community_enc TEXT, -- encrypted
  api_cred_enc TEXT, -- encrypted json
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online','offline','maintenance')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.8 mrtg_targets (mapping IP -> MRTG)
```sql
CREATE TABLE mrtg_targets (
  id BIGSERIAL PRIMARY KEY,
  ip_address_id BIGINT NOT NULL REFERENCES ip_addresses(id) ON DELETE CASCADE,
  pelanggan_id BIGINT REFERENCES pelanggans(id) ON DELETE SET NULL,
  perangkat_id BIGINT REFERENCES perangkats(id) ON DELETE SET NULL,
  interface_name VARCHAR(100), -- ether3, vlan100
  target_id_mrtg VARCHAR(150) NOT NULL, -- ID di sisi MRTG
  api_mode VARCHAR(20) NOT NULL DEFAULT 'json' CHECK (api_mode IN ('json','png')),
  base_url TEXT NOT NULL,
  auth_token_enc TEXT,
  png_url_template TEXT,
  aktif BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ip_address_id) -- 1 IP = 1 target aktif untuk MVP
);
CREATE INDEX idx_mrtg_pelanggan ON mrtg_targets(pelanggan_id);
```

### 2.9 mrtg_cache (opsional jika tanpa Redis)
```sql
CREATE TABLE mrtg_cache (
  target_id BIGINT NOT NULL REFERENCES mrtg_targets(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL CHECK (period IN ('daily','weekly','monthly','yearly')),
  payload_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (target_id, period)
);
```

> Produksi disarankan Redis dengan key `mrtg:{targetId}:{period}` TTL 180 detik, tabel ini sebagai fallback.

### 2.10 tikets + komentar
```sql
CREATE TABLE tikets (
  id BIGSERIAL PRIMARY KEY,
  no_tiket VARCHAR(20) NOT NULL UNIQUE, -- T-202609-0001
  pelanggan_id BIGINT NOT NULL REFERENCES pelanggans(id),
  judul VARCHAR(200) NOT NULL,
  kategori VARCHAR(30) CHECK (kategori IN ('mati','lambat','instalasi','adm','lainnya')),
  prioritas VARCHAR(10) DEFAULT 'normal' CHECK (prioritas IN ('low','normal','high','urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','progress','resolved','closed')),
  assignee_id BIGINT REFERENCES users(id),
  solusi TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE tiket_komentars (
  id BIGSERIAL PRIMARY KEY,
  tiket_id BIGINT NOT NULL REFERENCES tikets(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id),
  isi TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.11 invoices
```sql
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  no_invoice VARCHAR(30) NOT NULL UNIQUE, -- INV/2026/09/0001
  pelanggan_id BIGINT NOT NULL REFERENCES pelanggans(id),
  periode VARCHAR(7) NOT NULL, -- 2026-09
  jumlah INT NOT NULL,
  jatuh_tempo DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','overdue','cancel')),
  paid_at TIMESTAMPTZ,
  metode VARCHAR(30),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pelanggan_id, periode) -- cegah double generate
);
CREATE INDEX idx_inv_status ON invoices(status);
CREATE INDEX idx_inv_periode ON invoices(periode);
```

### 2.12 audit_logs
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  aksi VARCHAR(50) NOT NULL, -- pelanggan.create, ip.assign, ...
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  before_json JSONB,
  after_json JSONB,
  ip_addr VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
```

## 3. Seed awal (contoh)

```sql
INSERT INTO pakets (nama, down_mbps, up_mbps, harga) VALUES
 ('10 Mbps Rumahan', 10, 5, 150000),
 ('20 Mbps Rumahan', 20, 10, 200000),
 ('50 Mbps Bisnis', 50, 50, 750000);

INSERT INTO subnets (nama, cidr, gateway, kategori) VALUES
 ('Publik Pool 1', '103.147.9.0/24', '103.147.9.1', 'publik'),
 ('Manajemen', '192.168.10.0/24', '192.168.10.1', 'management');
-- Host IP di-generate oleh backend (bukan manual insert 254 baris).
```

## 4. Catatan implementasi IP generate

- Saat `POST /api/subnet`, backend parse CIDR (lib `ipaddr.js` / `netaddr` / `ipaddress` python), iterate host, bulk insert dengan `ON CONFLICT DO NOTHING`.
- Batasi prefix minimal `/22` (1022 host) di MVP agar tidak berat. Tolak `/16` dengan pesan jelas.
- Validasi overlap: `SELECT * FROM subnets WHERE cidr >> $1 OR cidr << $1 OR cidr = $1`.
