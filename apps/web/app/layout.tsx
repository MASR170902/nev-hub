import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEVHub | Manajemen Kegiatan",
  description: "Platform internal manajemen kegiatan NEVHub.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
