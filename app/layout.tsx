import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fondanalys – Analysera din portfölj",
  description: "Analysera din fondportfölj och få fondbyteförslag",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className={`${geist.className} min-h-screen`} style={{ background: "#f0f2f5", color: "#1a1a2e" }}>
        <header className="bg-white border-b border-gray-300 px-6 py-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Image src="/logo.svg" alt="Logo" width={40} height={40} />
            <div>
              <h1 className="text-xl font-bold text-blue-700">Fondanalys</h1>
              <p className="text-sm font-medium text-gray-600">Analysera din fondportfölj med relevanta nyckeltal</p>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
