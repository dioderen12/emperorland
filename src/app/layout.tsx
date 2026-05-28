import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmperorLand — Open · Deploy · Conquer",
  description: "Open packs, deploy Pokemon into dungeons, earn community points.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
        <Nav />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
