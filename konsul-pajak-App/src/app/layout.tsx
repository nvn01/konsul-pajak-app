import "nvn/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { AppProviders } from "@/components/providers";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Konsul Pajak - Asisten AI Perpajakan",
  description: "Chatbot AI untuk konsultasi perpajakan Indonesia",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
