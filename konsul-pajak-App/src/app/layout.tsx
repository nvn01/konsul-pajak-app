import "nvn/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["800"],
});

export const metadata: Metadata = {
  title: "Tanya Pajak AI - Asisten AI Perpajakan",
  description: "Tanya Seputar Pajak dan Hitung Pajakmu dengan Bantuan AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
