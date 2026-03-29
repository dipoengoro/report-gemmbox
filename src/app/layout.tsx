import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import Script from "next/script";
import QueryProvider from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Laporan Keuangan Gembox",
  description: "Laporan Interaktif Asisten Keuangan Pribadi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* Kita beri warna latar belakang agak abu-abu (bg-muted/30) agar "kertas" laporan terlihat menonjol */}
      <body className={`${GeistSans.className} antialiased bg-muted/30`}>
        <QueryProvider>
          {children}
        </QueryProvider>

        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}