// PM2 untuk VPS tanpa Docker: 1 proses Next.js.
// Pakai: pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: "crm-isp",
      script: "npm",
      args: "start -- -p 3000",
      cwd: "/var/www/crm-isp/app",
      instances: 1,
      exec_mode: "fork",
      env_production: { NODE_ENV: "production", PORT: "3000" },
      max_memory_restart: "512M",
    },
  ],
};
