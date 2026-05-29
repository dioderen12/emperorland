import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

// Retro pixel-arcade type system: Press Start 2P for display/headings/buttons
// (chunky 8-bit), VT323 for everything else (a readable pixel terminal face).
const pixel = Press_Start_2P({ variable: "--font-pixel", weight: "400", subsets: ["latin"] });
const pixelBody = VT323({ variable: "--font-pixel-body", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmperorLand — Open · Deploy · Conquer",
  description: "Open packs, deploy Pokemon into dungeons, earn community points.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${pixel.variable} ${pixelBody.variable} h-full antialiased dark`}>
      <body className="crt min-h-full flex flex-col text-slate-100">
        <Nav />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
