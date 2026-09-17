import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "owner@isp.local" },
    update: {},
    create: { name: "Owner", email: "owner@isp.local", passwordHash, role: "owner" },
  });

  await prisma.paket.createMany({
    data: [
      { nama: "10 Mbps Rumahan", downMbps: 10, upMbps: 5, harga: 150000, tipe: "rumahan" },
      { nama: "20 Mbps Rumahan", downMbps: 20, upMbps: 10, harga: 200000, tipe: "rumahan" },
      { nama: "50 Mbps Bisnis", downMbps: 50, upMbps: 50, harga: 750000, tipe: "bisnis" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed OK. Login: owner@isp.local / admin123");
}

main().finally(() => prisma.$disconnect());
