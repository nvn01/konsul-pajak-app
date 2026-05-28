"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  LogOut,
  Send,
  Loader2,
  Info,
  Phone,
  MessageCircle,
  BookOpen,
  Calculator,
  Tag,
  FileText,
  Scale,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History,
  Clock,
} from "lucide-react";

import { PublicHeader } from "@/components/public-header";
import { SignupPrompt } from "@/components/signup-prompt";
import { CreditsExhaustedModal } from "@/components/credits-exhausted-modal";
import { BrandText } from "@/components/brand-text";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "nvn/trpc/react";

// ---------------------------------------------------------------------------
// Types — match the AI response shape
// ---------------------------------------------------------------------------
type TarifDetail = {
  lapisan: string;
  tarif: string;
  pajak?: number;
};

type TaxCalculationResult = {
  kategori: string;
  subKategori: string;
  tarif: TarifDetail[];
  dpp: number;
  dppPenjelasan: string;
  pajakTerutang: number;
  perhitungan: string[];
  analisis: string;
  dasarHukum: Array<{
    source: string;
    kutipan?: string;
    url?: string;
  }>;
  ringkasan: string;
  inputParsed: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Example prompts for quick-fill
// ---------------------------------------------------------------------------
const EXAMPLE_PROMPTS = [
  "Saya karyawan swasta dengan gaji pokok Rp 10 juta per bulan, status menikah dengan 1 tanggungan (K/1). Berapa PPh 21 saya per bulan dan per tahun?",
  "Saya punya usaha UMKM dengan omzet Rp 300 juta per tahun. Berapa pajak final UMKM yang harus saya bayar?",
  "Saya menerima fee jasa konsultan sebesar Rp 50 juta. Berapa PPh 23 yang dipotong?",
  "Saya menjual barang sebesar Rp 100 juta, berapa PPN yang harus dipungut?",
  "PT saya memiliki penghasilan kena pajak Rp 1 miliar, berapa PPh Badan yang terutang?",
];

// ---------------------------------------------------------------------------
// Thinking Indicator
// ---------------------------------------------------------------------------
function CalculatingIndicator() {
  const [textIndex, setTextIndex] = useState(0);
  const loadingTexts = [
    "Menganalisis deskripsi keuangan...",
    "Menentukan jenis pajak yang berlaku...",
    "Mencari dasar hukum yang relevan...",
    "Menghitung Dasar Pengenaan Pajak (DPP)...",
    "Menerapkan tarif pajak...",
    "Menyusun perhitungan akhir...",
  ];

  useState(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) =>
        prev + 1 < loadingTexts.length ? prev + 1 : prev,
      );
    }, 4000);
    return () => clearInterval(interval);
  });

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-8 w-8 text-primary animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-sidebar-primary flex items-center justify-center">
          <Loader2 className="h-3 w-3 animate-spin text-sidebar-primary-foreground" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"></div>
        </div>
        <span
          className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300"
          key={textIndex}
        >
          {loadingTexts[textIndex]}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format currency helper
// ---------------------------------------------------------------------------
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Result Display Component
// ---------------------------------------------------------------------------
function CalculationResultPanel({ result }: { result: TaxCalculationResult }) {
  const [isDasarHukumOpen, setIsDasarHukumOpen] = useState(false);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Ringkasan Card — Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3 text-primary-foreground/70">
          <Scale className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Pajak Terutang
          </span>
        </div>
        <div className="text-3xl md:text-4xl font-bold mb-2">
          {formatRupiah(result.pajakTerutang)}
        </div>
        <p className="text-sm text-primary-foreground/80">
          {result.ringkasan}
        </p>
      </div>

      {/* Kategori + DPP Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Kategori */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Kategori Pajak
            </span>
          </div>
          <div className="font-semibold text-foreground">
            {result.kategori}
          </div>
          {result.subKategori && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {result.subKategori}
            </div>
          )}
        </div>

        {/* DPP */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">
              DPP
            </span>
          </div>
          <div className="font-semibold text-foreground">
            {formatRupiah(result.dpp)}
          </div>
          {result.dppPenjelasan && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {result.dppPenjelasan}
            </div>
          )}
        </div>
      </div>

      {/* Tarif Table */}
      {result.tarif.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-wider">
              Tarif yang Diterapkan
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Lapisan</th>
                  <th className="pb-2 pr-4 font-medium">Tarif</th>
                  <th className="pb-2 font-medium text-right">Pajak</th>
                </tr>
              </thead>
              <tbody>
                {result.tarif.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 pr-4 text-foreground">{t.lapisan}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center rounded-full bg-sidebar-primary/10 px-2 py-0.5 text-xs font-medium text-sidebar-primary">
                        {t.tarif}
                      </span>
                    </td>
                    <td className="py-2 text-right text-foreground">
                      {t.pajak !== undefined && t.pajak !== null
                        ? formatRupiah(t.pajak)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Perhitungan Steps */}
      {result.perhitungan.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <Calculator className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Langkah Perhitungan
            </span>
          </div>
          <div className="space-y-2">
            {result.perhitungan.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analisis AI */}
      {result.analisis && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Analisis AI
            </span>
          </div>
          <div className="prose-chat text-sm text-foreground leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.analisis}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Dasar Hukum */}
      {result.dasarHukum.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setIsDasarHukumOpen(!isDasarHukumOpen)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Dasar Hukum ({result.dasarHukum.length} referensi)
              </span>
            </div>
            {isDasarHukumOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {isDasarHukumOpen && (
            <div className="border-t border-border p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
              {result.dasarHukum.map((ref, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {ref.source}
                    </span>
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-sidebar-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        BPK
                      </a>
                    )}
                  </div>
                  {ref.kutipan && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1 italic">
                      &ldquo;{ref.kutipan}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
interface KalkulatorShellProps {
  isGuest?: boolean;
}

export function KalkulatorShell({ isGuest = false }: KalkulatorShellProps) {
  const { data: session } = useSession();
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  // Guest state
  const [guestCalculated, setGuestCalculated] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kp_guest_calc") === "1";
    }
    return false;
  });
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showCreditsExhausted, setShowCreditsExhausted] = useState(false);

  // Credit info for logged-in users
  const creditsQuery = api.chat.getCredits.useQuery(undefined, {
    enabled: !isGuest,
  });

  const calculateMutation = api.kalkulator.calculate.useMutation();
  const guestCalculateMutation = api.kalkulator.guestCalculate.useMutation();

  // History for logged-in users
  const historyQuery = api.kalkulator.getHistory.useQuery(undefined, {
    enabled: !isGuest,
  });
  const [showHistory, setShowHistory] = useState(false);

  const isCalculating =
    calculateMutation.isPending || guestCalculateMutation.isPending;

  const handleCalculate = async () => {
    if (!description.trim()) return;

    // Guest: block if already used
    if (isGuest && guestCalculated) {
      setShowSignupPrompt(true);
      return;
    }

    // Auth: check credits
    if (!isGuest && creditsQuery.data && creditsQuery.data.credits <= 0) {
      setShowCreditsExhausted(true);
      return;
    }

    try {
      if (isGuest) {
        const guestResult = await guestCalculateMutation.mutateAsync({
          description: description.trim(),
        });
        setResult(guestResult);
        setGuestCalculated(true);
        localStorage.setItem("kp_guest_calc", "1");
        setTimeout(() => setShowSignupPrompt(true), 2000);
      } else {
        const authResult = await calculateMutation.mutateAsync({
          description: description.trim(),
        });
        setResult(authResult.result);
        // Invalidate credits and history
        void creditsQuery.refetch();
        void historyQuery.refetch();
      }
    } catch (error: any) {
      console.error("[Kalkulator] Calculation failed", error);
      if (
        error?.message?.includes?.("Kredit") ||
        error?.data?.code === "FORBIDDEN"
      ) {
        setShowCreditsExhausted(true);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleCalculate();
  };

  const handleExampleClick = (prompt: string) => {
    setDescription(prompt);
  };

  const handleReset = () => {
    setResult(null);
    setDescription("");
  };

  const handleLoadFromHistory = (historyItem: any) => {
    setResult(historyItem.resultJson as TaxCalculationResult);
    setDescription(historyItem.inputText);
    setShowHistory(false);
  };

  const handleLogout = () => {
    void signOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header — Guest vs Authenticated */}
      {isGuest ? (
        <PublicHeader />
      ) : (
        <header className="bg-primary text-primary-foreground border-primary-foreground/10 border-b px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <img
                  src="/logo-header.png"
                  alt="KP"
                  className="h-8 w-8 object-contain"
                />
                <BrandText className="text-lg hidden sm:block" />
              </Link>
            </div>

            {/* Toggle Tabs */}
            <div className="flex items-center bg-white rounded-full p-1 shadow-sm">
              <Link
                href="/chat"
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Tanya Pajak AI
              </Link>
              <Link
                href="/direktori"
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Direktori
              </Link>
              <div className="px-4 py-2 rounded-full text-sm font-medium text-sidebar-primary-foreground bg-sidebar-primary">
                Kalkulator
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={session?.user?.image ?? ""}
                        alt={session?.user?.name ?? "User"}
                      />
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session?.user?.name}
                      </p>
                      <p className="text-muted-foreground text-xs leading-none">
                        {session?.user?.email}
                      </p>
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
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-2 py-1.5">
                    Fitur
                  </DropdownMenuLabel>
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
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )}

      {/* Main Content — Split Panel */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-140px)]">
            {/* LEFT PANEL — Input */}
            <div className="flex flex-col">
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col h-full">
                {/* Title */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-sidebar-primary/10 flex items-center justify-center">
                      <Calculator className="h-5 w-5 text-sidebar-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">
                        Kalkulator Pajak AI
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Deskripsikan situasi keuangan Anda, AI akan menghitung
                        pajaknya
                      </p>
                    </div>
                  </div>
                </div>

                {/* Textarea */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                  <div className="flex-1 mb-4">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ceritakan situasi keuangan Anda...&#10;&#10;Contoh: Saya karyawan swasta dengan gaji Rp 10 juta/bulan, status menikah dengan 1 tanggungan (K/1). Berapa PPh 21 saya?"
                      className="min-h-[180px] h-full resize-none border border-border rounded-xl bg-background px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                      disabled={isCalculating || (isGuest && guestCalculated)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={
                        isCalculating ||
                        !description.trim() ||
                        (isGuest && guestCalculated)
                      }
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sidebar-primary px-5 py-3 text-sm font-semibold text-sidebar-primary-foreground shadow-sm transition-all hover:bg-sidebar-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isCalculating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Menghitung...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4" />
                          Hitung Pajak
                        </>
                      )}
                    </button>
                    {result && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Hitung Ulang
                      </button>
                    )}
                  </div>
                </form>

                {/* Example Prompts */}
                {!result && (
                  <div className="mt-6 pt-5 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                      Contoh Skenario
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleExampleClick(prompt)}
                          disabled={isCalculating || (isGuest && guestCalculated)}
                          className="text-left rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted hover:border-sidebar-primary/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {prompt.length > 80
                            ? prompt.substring(0, 80) + "..."
                            : prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* History Panel — Auth users only */}
              {!isGuest && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span>Riwayat Perhitungan</span>
                      {historyQuery.data && historyQuery.data.length > 0 && (
                        <span className="inline-flex items-center rounded-full bg-sidebar-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-primary">
                          {historyQuery.data.length}
                        </span>
                      )}
                    </div>
                    {showHistory ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {showHistory && (
                    <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden animate-in slide-in-from-top-2 duration-200">
                      {historyQuery.isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Memuat riwayat...
                        </div>
                      ) : !historyQuery.data || historyQuery.data.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Belum ada riwayat perhitungan
                        </div>
                      ) : (
                        <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                          {historyQuery.data.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleLoadFromHistory(item)}
                              className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="inline-flex items-center rounded-full bg-sidebar-primary/10 px-2 py-0.5 text-[10px] font-medium text-sidebar-primary">
                                  {item.kategori}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {new Date(item.createdAt).toLocaleDateString(
                                    "id-ID",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                                {item.inputText}
                              </p>
                              <div className="mt-1 text-xs font-semibold text-foreground">
                                {formatRupiah(item.pajakTerutang)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT PANEL — Result */}
            <div className="flex flex-col">
              {isCalculating ? (
                <div className="rounded-2xl border border-border bg-card p-6 flex-1 flex items-center justify-center">
                  <CalculatingIndicator />
                </div>
              ) : result ? (
                <CalculationResultPanel result={result} />
              ) : (
                /* Empty State */
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 flex-1 flex items-center justify-center">
                  <div className="text-center max-w-sm">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Scale className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Hasil Perhitungan
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Deskripsikan situasi keuangan Anda di panel kiri, lalu
                      klik <strong>&quot;Hitung Pajak&quot;</strong> untuk
                      melihat perhitungan lengkap di sini.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {[
                        "Kategori Pajak",
                        "Tarif",
                        "DPP",
                        "Perhitungan",
                        "Analisis AI",
                        "Dasar Hukum",
                      ].map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Guest signup prompt modal */}
      {showSignupPrompt && isGuest && (
        <SignupPrompt
          variant="modal"
          onDismiss={() => setShowSignupPrompt(false)}
        />
      )}

      {/* Credits exhausted modal */}
      {showCreditsExhausted && (
        <CreditsExhaustedModal
          onClose={() => setShowCreditsExhausted(false)}
        />
      )}
    </div>
  );
}
