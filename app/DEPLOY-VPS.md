# Deploy ke VPS tanpa Docker (Ubuntu 22/24)

Arsitektur: `Internet → Nginx :80/:443 → localhost:3000 (Next.js via PM2) → MySQL localhost`.

## 1. Siapkan VPS (sekali saja)

```bash
# Node 20 LTS + Nginx + MySQL + PM2 + Certbot
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs nginx mysql-server
sudo npm i -g pm2
sudo apt install -y certbot python3-certbot-nginx

# DB + user
sudo mysql -e "CREATE DATABASE IF NOT EXISTS crm_isp CHARACTER SET utf8mb4;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'crm'@'localhost' IDENTIFIED BY 'GANTI-PASSWORD-KUAT';"
sudo mysql -e "GRANT ALL ON crm_isp.* TO 'crm'@'localhost'; FLUSH PRIVILEGES;"
```

## 2. Deploy aplikasi

```bash
sudo mkdir -p /var/www/crm-isp && sudo chown $USER:$USER /var/www/crm-isp
cd /var/www/crm-isp
git clone <repo-url> .   # repo berisi folder app/ + docs/
cd app
cp .env.example .env && nano .env   # isi DATABASE_URL, JWT_SECRET, MRTG_*
npm ci --no-audit --no-fund
npx prisma migrate deploy            # pertama kali; atau: npx prisma db push
npx prisma db seed                   # owner@isp.local / admin123, GANTI setelah login
npm run build
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

Update berikutnya:
```bash
cd /var/www/crm-isp/app && git pull
npm ci --no-audit --no-fund
npx prisma migrate deploy
npm run build && pm2 restart crm-isp
```

## 3. Nginx reverse proxy + HTTPS

`/etc/nginx/sites-available/crm-isp`:
```nginx
server {
  server_name crm.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/crm-isp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crm.example.com
```

## 4. Cron preload MRTG (opsional MVP)

Sambungkan cron sistem ke endpoint refresh agar cache hangat tiap 5 menit:
```bash
crontab -e
# */5 * * * * curl -sf -H "Authorization: Bearer $CRON_TOKEN" https://crm.example.com/api/cron/preload-mrtg
```

## 5. Checklist pasca-deploy

- [ ] `GET https://crm.example.com/api/health` → `{"ok":true,"db":"up"}`
- [ ] Login seed lalu ganti password + buat user admin/noc.
- [ ] Tambah 1 subnet `/24` kecil dulu, assign 1 IP, link 1 target MRTG, cek grafik Daily.
- [ ] Backup MySQL harian: `mysqldump crm_isp | gzip > /backup/crm-$(date +%F).sql.gz` + retensi 7 hari.
```

## 6. Rollback cepat

```bash
cd /var/www/crm-isp/app && git log --oneline -5
git checkout <commit-bagus> && npm ci && npm run build && pm2 restart crm-isp
```
