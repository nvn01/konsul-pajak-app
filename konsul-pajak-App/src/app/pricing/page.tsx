"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Info, Phone, MessageCircle, BookOpen, Calculator, ShieldCheck, HelpCircle, ArrowLeft, Coins } from "lucide-react";
import { AuthFeatureTabs } from "@/components/auth-feature-tabs";
import { BrandText } from "@/components/brand-text";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PublicHeader } from "@/components/public-header";
import { api } from "nvn/trpc/react";

export default function PricingPage() {
  const { data: session } = useSession();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);

  const creditsQuery = api.chat.getCredits.useQuery(undefined, {
    enabled: !!session,
  });

  const handleLogout = () => {
    void signOut({ callbackUrl: "/" });
  };

  const packages = [
    {
      id: "starter",
      name: "Paket Hemat (Starter)",
      credits: 50,
      price: "Rp 25.000",
      pricePerCredit: "Rp 500",
      description: "Sangat cocok untuk wajib pajak pribadi yang membutuhkan konsultasi singkat atau perhitungan pajak bulanan standar.",
      color: "from-blue-500 to-cyan-500",
      features: [
        "Mendapatkan 50 Kredit pesan",
        "Akses Konsultasi AI Pajak",
        "Akses Kalkulator Pajak AI",
        "Kredit berlaku selamanya (tidak hangus)",
      ],
    },
    {
      id: "pro",
      name: "Paket Populer (Pro)",
      credits: 200,
      price: "Rp 75.000",
      pricePerCredit: "Rp 375",
      description: "Pilihan terbaik untuk pelaku UMKM atau pekerja lepas (freelancer) untuk kepatuhan pajak rutin.",
      color: "from-amber-500 to-orange-600",
      popular: true,
      features: [
        "Mendapatkan 200 Kredit pesan",
        "Akses Konsultasi AI Pajak",
        "Akses Kalkulator Pajak AI",
        "Kredit berlaku selamanya (tidak hangus)",
        "Biaya per kredit lebih hemat 25%",
      ],
    },
    {
      id: "expert",
      name: "Paket Premium (Expert)",
      credits: 500,
      price: "Rp 149.000",
      pricePerCredit: "Rp 298",
      description: "Dirancang untuk profesional, konsultan pajak junior, mahasiswa akuntansi, atau badan usaha dengan kebutuhan perhitungan intensif.",
      color: "from-purple-600 to-pink-600",
      features: [
        "Mendapatkan 500 Kredit pesan",
        "Akses Konsultasi AI Pajak",
        "Akses Kalkulator Pajak AI",
        "Kredit berlaku selamanya (tidak hangus)",
        "Biaya per kredit paling hemat (hemat 40%)",
      ],
    },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header — Guest vs Authenticated */}
      {!session ? (
        <PublicHeader />
      ) : (
        <header className="bg-primary text-primary-foreground border-primary-foreground/10 border-b px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo-header.png" alt="KP" className="h-8 w-8 object-contain" />
                <BrandText className="text-lg hidden sm:block" />
              </Link>
            </div>

            <AuthFeatureTabs />

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? "User"} />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                    <p className="text-muted-foreground text-xs leading-none">{session?.user?.email}</p>
                    {creditsQuery.data && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-sidebar-primary bg-sidebar-primary/10 px-2.5 py-1 rounded w-fit font-semibold">
                        <span>Sisa Kredit: {creditsQuery.data.credits} pesan</span>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/about">
                    <Info className="mr-2 h-4 w-4" />
                    <span>Tentang Aplikasi</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/contact">
                    <Phone className="mr-2 h-4 w-4" />
                    <span>Kontak</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-2 py-1.5">Fitur</DropdownMenuLabel>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/chat">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>Konsultasi AI</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/direktori">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Direktori Peraturan</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/kalkulator">
                    <Calculator className="mr-2 h-4 w-4" />
                    <span>Kalkulator Pajak</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          {/* Header Title */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
              Daftar Paket Kredit Tanya Pajak AI
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              Dapatkan analisis perpajakan akurat, pencarian dasar hukum peraturan BPK, dan perhitungan PPh/PPN instan dengan membeli paket kredit konsultasi.
            </p>
          </div>

          {/* Credit consumption rule box */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-10 shadow-sm max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-primary/10 text-primary rounded-full p-3.5 flex-shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm mb-1">Bagaimana Kredit Dikonsumsi?</h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Setiap <strong>1 pesan konsultasi chat</strong> ke AI memotong <strong>1 kredit</strong>.</li>
                <li>Setiap <strong>1 perhitungan lengkap kalkulator pajak</strong> memotong <strong>2 kredit</strong>.</li>
                <li>Pengguna baru mendapatkan kuota gratis sebesar <strong>20 kredit per bulan</strong> yang di-refresh secara berkala.</li>
              </ul>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-stretch">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-md transition-all duration-300 hover:shadow-lg ${
                  pkg.popular ? "border-amber-500 scale-[1.02] ring-2 ring-amber-500/20" : "border-border"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-sm">
                    Paling Populer
                  </span>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-bold text-foreground mb-1">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-extrabold text-foreground">{pkg.price}</span>
                    <span className="text-xs text-muted-foreground">/ {pkg.credits} Kredit</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 font-medium">
                    (Harga per kredit: {pkg.pricePerCredit})
                  </p>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed h-12">
                    {pkg.description}
                  </p>
                </div>

                <div className="border-t border-border/80 pt-5 mb-8 flex-1">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Fitur Paket:</h4>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => setSelectedPkg(pkg.name)}
                  className={`w-full py-2.5 font-bold rounded-xl shadow transition-all ${
                    pkg.popular
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-95"
                      : "bg-primary text-primary-foreground hover:bg-primary/95"
                  }`}
                >
                  Beli Sekarang
                </Button>
              </div>
            ))}
          </div>

          {/* Refund policy & compliance section */}
          <div className="border border-border/80 bg-muted/30 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Syarat, Ketentuan & Kebijakan Pengembalian</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-bold text-foreground mb-1.5">Ketentuan Layanan Pembelian Kredit</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Kredit digunakan secara eksklusif untuk mengakses fitur AI pada platform Tanya Pajak AI.</li>
                  <li>Kredit yang telah dibeli tidak memiliki masa kedaluwarsa dan dapat digunakan kapan saja.</li>
                  <li>Setiap pembayaran diproses secara aman menggunakan sistem Payment Gateway Midtrans.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1.5">Kebijakan Pembatalan & Pengembalian Dana</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pembelian kredit bersifat final. Setelah transaksi berhasil, kredit akan langsung ditambahkan ke akun Anda.</li>
                  <li>Pengembalian dana (refund) hanya dapat diajukan jika terjadi gangguan teknis sistem yang mengakibatkan kredit tidak masuk ke akun Anda setelah pembayaran sukses dilakukan.</li>
                  <li>Untuk bantuan transaksi dan klaim, silakan hubungi kontak dukungan kami di halaman <Link href="/contact" className="text-primary font-semibold hover:underline">Hubungi Kami</Link>.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Processing Modal (Placeholder) */}
      {selectedPkg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <HelpCircle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Integrasi Pembayaran Sedang Diproses</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Anda memilih <strong>{selectedPkg}</strong>. Akun merchant Payment Gateway Midtrans kami sedang dalam tahap verifikasi admin. 
              <br /><br />
              Untuk melakukan top up kredit secara manual/uji coba saat ini, silakan hubungi tim administrator di halaman kontak.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="rounded-xl px-5" onClick={() => setSelectedPkg(null)}>
                Tutup
              </Button>
              <Button asChild className="rounded-xl px-5 bg-primary text-primary-foreground">
                <Link href="/contact">Hubungi Kami</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
