import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "ArcSwap — Trade any token on Arc Chain",
  description: "Decentralized exchange on Arc Testnet. Swap any token, provide liquidity, earn fees.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ThemeProvider>
          <Providers>
            <ToastProvider>
              <Navbar />
              <main className="min-h-screen pt-10 pb-4 px-4">{children}</main>
              <Footer />
            </ToastProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
