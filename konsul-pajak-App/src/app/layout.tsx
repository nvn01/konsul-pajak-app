import "nvn/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["800"],
});

export const metadata: Metadata = {
  title: "Tanya Pajak AI - Asisten AI Perpajakan",
  description: "Chatbot AI untuk konsultasi perpajakan Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
