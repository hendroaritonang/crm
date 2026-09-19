import { z } from "zod";

// Validasi IPv4 sederhana + CIDR. Sengaja tanpa dep tambahan agar ringan.
const ipv4 = z
  .string()
  .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Format IPv4 tidak valid")
  .refine(
    (v) => v.split(".").every((n) => Number(n) >= 0 && Number(n) <= 255),
    "Oktet IP harus 0-255"
  );

const cidr = z
  .string()
  .regex(/^(\d{1,3}\.){3}\d{1,3}\/(8|9|1[0-9]|2[0-9]|3[0-2])$/, "Format CIDR tidak valid (ex: 103.147.9.0/24)")
  .refine((v) => {
    const [ip, prefix] = v.split("/");
    if (!ip) return false;
    const ok = ip.split(".").every((n) => Number(n) >= 0 && Number(n) <= 255);
    if (!ok) return false;
    // Tolak prefix terlalu besar agar generate tidak meledak (MVP max /22 = 1022 host)
    return Number(prefix) >= 22 && Number(prefix) <= 32;
  }, "Prefix didukung /22 s/d /32 untuk MVP");

export const SubnetCreateSchema = z.object({
  nama: z.string().min(3).max(100),
  cidr,
  gateway: ipv4.optional().or(z.literal("").transform(() => undefined)),
  kategori: z.enum(["publik", "privat", "management"]),
  vlan_id: z.number().int().positive().optional(),
  deskripsi: z.string().max(500).optional(),
});

export const AssignIpSchema = z.object({
  pelanggan_id: z.number().int().positive(),
  tipe: z.enum(["WAN", "LAN", "management", "dedicated"]).default("WAN"),
  hostname: z.string().max(150).optional(),
  catatan: z.string().max(500).optional(),
});

export const PelangganCreateSchema = z.object({
  nama: z.string().min(3).max(150),
  hp: z.string().regex(/^08[0-9]{8,11}$/, "No HP harus format 08xx"),
  alamat: z.string().min(5),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  paket_id: z.number().int().positive().optional(),
  tipe: z.enum(["rumahan", "bisnis", "dedicated"]).default("rumahan"),
  tgl_jatuh_tempo: z.number().int().min(1).max(28).default(10),
});

export const MrtgLinkSchema = z.object({
  ip_address_id: z.number().int().positive(),
  target_id_mrtg: z.string().min(1).max(150),
  perangkat_id: z.number().int().positive().optional(),
  interface_name: z.string().max(100).optional(),
  api_mode: z.enum(["json", "png", "prtg"]).default("json"),
  base_url: z.string().url(),
  auth_token: z.string().max(500).optional(),
  png_url_template: z.string().max(500).optional(),
});

// ---- Util IP: expand CIDR ke list host (IPv4 saja, max /22) ----
export function ipToInt(ip: string): number {
  const p = ip.split(".").map(Number);
  return ((p[0]! * 256 + p[1]!) * 256 + p[2]!) * 256 + p[3]!;
}

export function intToIp(n: number): string {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

export function expandCidr(cidrStr: string): string[] {
  const [ip, prefixStr] = cidrStr.split("/");
  const prefix = Number(prefixStr);
  const base = ipToInt(ip!);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = base & mask;
  const broadcast = network | (~mask >>> 0);
  const out: string[] = [];
  // skip network & broadcast kecuali /31 dan /32
  const start = prefix >= 31 ? network : network + 1;
  const end = prefix >= 31 ? broadcast : broadcast - 1;
  for (let i = start; i <= end; i++) out.push(intToIp(i >>> 0));
  return out;
}

export function formatBps(bps: number): string {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${bps} bps`;
}
