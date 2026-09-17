import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM ISP",
  description: "CRM / Information System untuk ISP kecil: pelanggan, IP, MRTG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full bg-zinc-100 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
