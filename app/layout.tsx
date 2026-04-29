import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { TitleBar } from "@/components/layout/TitleBar";
import { Toolbar } from "@/components/layout/Toolbar";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wealth OS",
  description: "Console de pilotage patrimonial — iMac G3 multicolor",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <WindowFrame>
          <TitleBar />
          <Toolbar />
          <div className="flex min-h-[720px]">
            <Sidebar />
            <main
              className="
                flex-1 p-[22px] relative
                bg-[radial-gradient(ellipse_at_top_right,rgba(255,200,150,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(180,150,220,0.15)_0%,transparent_50%),linear-gradient(180deg,#f4f7fb_0%,#e6edf4_100%)]
              "
            >
              {children}
            </main>
          </div>
        </WindowFrame>
      </body>
    </html>
  );
}
