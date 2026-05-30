"use client";

import { useState, useRef, useEffect } from "react";
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
  HelpCircle,
  CheckCircle2,
  SkipForward,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
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

type FollowUpQuestion = {
  id: string;
  label: string;
  options: Array<{
    value: string;
    label: string;
  }>;
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
  followUpQuestions: FollowUpQuestion[];
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
        <div className="prose-chat text-sm text-primary-foreground/80 [&_strong]:text-primary-foreground [&_p]:m-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result.ringkasan}
          </ReactMarkdown>
        </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isCalculating =
    calculateMutation.isPending || guestCalculateMutation.isPending;

  const resultPanelRef = useRef<HTMLDivElement>(null);

  // Scroll to result panel on mobile when calculation starts or finishes
  useEffect(() => {
    if ((isCalculating || result) && typeof window !== "undefined" && window.innerWidth < 1024) {
      const timer = setTimeout(() => {
        resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCalculating, result]);

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
    setFollowUpAnswers({});
    setSidebarOpen(false);
  };

  const handleLoadFromHistory = (historyItem: any) => {
    setResult(historyItem.resultJson as TaxCalculationResult);
    setDescription(historyItem.inputText);
    setShowHistory(false);
    setSidebarOpen(false);
  };

  // ─── Follow-up questions state ──────────────────────────────────
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});

  const handleFollowUpSelect = (questionId: string, value: string) => {
    setFollowUpAnswers((prev) => {
      // Toggle: if same value clicked again, deselect
      if (prev[questionId] === value) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleFollowUpSkip = (questionId: string) => {
    setFollowUpAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleFollowUpRecalculate = async () => {
    if (!result || Object.keys(followUpAnswers).length === 0) return;

    // Build the enriched prompt
    const questions = result.followUpQuestions;
    const additionalLines: string[] = [];
    for (const q of questions) {
      const answer = followUpAnswers[q.id];
      if (answer) {
        const selectedOption = q.options.find((o) => o.value === answer);
        additionalLines.push(`${q.label}: ${selectedOption?.label ?? answer}`);
      }
    }

    const enrichedPrompt = `${description.trim()}\n\nInformasi tambahan:\n${additionalLines.map((l) => `- ${l}`).join("\n")}`;

    // Update the prompt box with enriched text
    setDescription(enrichedPrompt);
    setFollowUpAnswers({});

    // Re-calculate
    try {
      if (isGuest) {
        // Guest can't recalculate (already used their free try)
        return;
      }
      const authResult = await calculateMutation.mutateAsync({
        description: enrichedPrompt,
      });
      setResult(authResult.result);
      void creditsQuery.refetch();
      void historyQuery.refetch();
    } catch (error: any) {
      console.error("[Kalkulator] Follow-up recalculation failed", error);
      if (
        error?.message?.includes?.("Kredit") ||
        error?.data?.code === "FORBIDDEN"
      ) {
        setShowCreditsExhausted(true);
      }
    }
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
            <div className="flex items-center gap-2 sm:gap-3">
              {!isGuest && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/10 transition-colors cursor-pointer"
                  title={sidebarOpen ? "Tutup riwayat" : "Buka riwayat"}
                >
                  <History className="h-5 w-5" />
                </button>
              )}
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
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span className="hidden sm:inline">Tanya Pajak AI</span>
                <span className="sm:hidden">Tanya AI</span>
              </Link>
              <Link
                href="/direktori"
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Direktori
              </Link>
              <div className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-sidebar-primary-foreground bg-sidebar-primary">
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

      {/* Main Content — Sidebar + Split Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* ═══════ HISTORY SIDEBAR (Auth only, hidden by default) ═══════ */}
        {!isGuest && (
          <>
            {/* Mobile backdrop for sidebar */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/45 z-40 lg:hidden transition-opacity duration-300"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar panel */}
            <aside
              className={`border-r border-border bg-card flex flex-col shrink-0 transition-all duration-300 ease-in-out 
                fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-0 h-full lg:h-auto shadow-2xl lg:shadow-none
                ${sidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0"}
                overflow-hidden`}
            >
              <div className="w-72 flex flex-col h-full">
                {/* Sidebar header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-sidebar-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Riwayat
                    </span>
                    {historyQuery.data && historyQuery.data.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-sidebar-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-primary">
                        {historyQuery.data.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Tutup sidebar"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>

                {/* Perhitungan Baru Button */}
                <div className="p-3 border-b border-border">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground px-4 py-2.5 text-xs font-bold shadow-sm transition-all hover:bg-sidebar-primary/90 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Perhitungan Baru
                  </button>
                </div>

                {/* History list */}
                <div className="flex-1 overflow-y-auto">
                  {historyQuery.isLoading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Memuat...
                    </div>
                  ) : !historyQuery.data || historyQuery.data.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="mx-auto h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                        <Calculator className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Belum ada riwayat perhitungan
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
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
                                { day: "numeric", month: "short" },
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                            {item.inputText}
                          </p>
                          <div className="mt-1 text-xs font-bold text-foreground">
                            {formatRupiah(item.pajakTerutang)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Sidebar toggle button (visible when closed) */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="hidden lg:flex shrink-0 w-8 border-r border-border bg-card items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer group"
                title="Buka riwayat perhitungan"
              >
                <PanelLeftOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
          </>
        )}

        {/* ═══════ MAIN AREA ═══════ */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:min-h-[calc(100vh-140px)]">
              {/* LEFT PANEL — Input + Follow-up */}
              <div className="flex flex-col gap-4">
                {/* Input Card */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  {/* Title */}
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/kalkulator-icon.webp"
                      alt="Kalkulator Pajak AI"
                      className="h-[2.925rem] w-[2.925rem] object-contain"
                      fetchPriority="high"
                    />
                    <div>
                      <h1 className="text-lg font-bold text-foreground">
                        Kalkulator Pajak AI
                      </h1>
                      <p className="text-[11px] text-muted-foreground">
                        Deskripsikan situasi keuangan Anda
                      </p>
                    </div>
                  </div>

                  {/* Textarea */}
                  <form onSubmit={handleSubmit}>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Contoh: Saya karyawan dengan gaji Rp 10 juta/bulan. Berapa PPh 21 saya?"
                      className="min-h-[100px] max-h-[160px] resize-none border border-border rounded-xl bg-background px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                      disabled={isCalculating || (isGuest && guestCalculated)}
                    />

                    {/* Action Buttons */}
                    <div className="mt-3">
                      <button
                        type="submit"
                        disabled={
                          isCalculating ||
                          !description.trim() ||
                          (isGuest && guestCalculated)
                        }
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sidebar-primary px-5 py-2.5 text-sm font-semibold text-sidebar-primary-foreground shadow-sm transition-all hover:bg-sidebar-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                    </div>
                  </form>
                </div>

                {/* ── Follow-Up Questions ── */}
                {result && result.followUpQuestions && result.followUpQuestions.length > 0 && !isGuest && (
                  <div className="rounded-2xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 p-5 animate-in fade-in slide-in-from-bottom-3 duration-500 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                        <HelpCircle className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-amber-900">
                          Perbaiki Perhitungan
                        </h3>
                        <p className="text-[11px] text-amber-700/70">
                          AI membuat asumsi — pilih opsi untuk hasil lebih akurat
                        </p>
                      </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-3">
                      {result.followUpQuestions.map((question) => {
                        const isAnswered = !!followUpAnswers[question.id];
                        return (
                          <div
                            key={question.id}
                            className={`rounded-xl p-3 transition-all duration-200 ${
                              isAnswered
                                ? "bg-white/80 border-2 border-amber-300 shadow-sm"
                                : "bg-white/50 border border-amber-200/50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-[13px] font-semibold text-amber-900">
                                {question.label}
                              </span>
                              {isAnswered ? (
                                <button
                                  type="button"
                                  onClick={() => handleFollowUpSkip(question.id)}
                                  className="text-[10px] text-amber-600 hover:text-amber-800 transition-colors cursor-pointer flex items-center gap-1 font-medium"
                                >
                                  <SkipForward className="h-3 w-3" />
                                  Batalkan
                                </button>
                              ) : (
                                <span className="text-[10px] text-amber-500/70 italic font-medium">
                                  Opsional
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {question.options.map((option) => {
                                const isSelected = followUpAnswers[question.id] === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleFollowUpSelect(question.id, option.value)}
                                    disabled={isCalculating}
                                    className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                                      isSelected
                                        ? "border-amber-400 bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md scale-[1.02]"
                                        : "border-amber-200/70 bg-white text-amber-800 hover:border-amber-300 hover:bg-amber-50 hover:shadow-sm"
                                    }`}
                                  >
                                    {isSelected && (
                                      <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                                    )}
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Recalculate button */}
                    <button
                      type="button"
                      onClick={() => void handleFollowUpRecalculate()}
                      disabled={isCalculating || Object.keys(followUpAnswers).length === 0}
                      className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                    >
                      {isCalculating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Menghitung Ulang...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Hitung Ulang dengan Info Tambahan
                          {Object.keys(followUpAnswers).length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">
                              {Object.keys(followUpAnswers).length} dipilih
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ── Example Prompts (only when no result yet and not loading) ── */}
                {!result && !isCalculating && (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                      Contoh Skenario
                    </p>
                    <div className="flex flex-col gap-2">
                      {EXAMPLE_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleExampleClick(prompt)}
                          disabled={isCalculating || (isGuest && guestCalculated)}
                          className="text-left rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted hover:border-sidebar-primary/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {prompt.length > 100
                            ? prompt.substring(0, 100) + "..."
                            : prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL — Result */}
              <div ref={resultPanelRef} className="flex flex-col scroll-mt-20">
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
      </div>

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
