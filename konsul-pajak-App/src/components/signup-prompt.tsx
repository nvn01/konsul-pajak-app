"use client";

import Link from "next/link";
import { Calculator } from "lucide-react";

/**
 * SignupPrompt — popup/banner shown to guest users after their 1 free message or calculation.
 */
interface SignupPromptProps {
  /** Whether to show as a fixed overlay modal (true) or inline banner (false) */
  variant?: "modal" | "banner";
  /** Feature context: chat or kalkulator */
  feature?: "chat" | "kalkulator";
  /** Custom title override */
  title?: string;
  /** Custom description override */
  description?: string;
  /** Custom login URL override */
  loginUrl?: string;
  /** Callback to dismiss the prompt */
  onDismiss?: () => void;
}

export function SignupPrompt({
  variant = "banner",
  feature = "chat",
  title,
  description,
  loginUrl,
  onDismiss,
}: SignupPromptProps) {
  const isKalkulator = feature === "kalkulator";

  const resolvedTitle =
    title ??
    (isKalkulator
      ? "Masuk untuk Melanjutkan Perhitungan Pajak"
      : "Masuk dengan email untuk melanjutkan chat");

  const resolvedDescription =
    description ??
    (isKalkulator
      ? "Anda telah menggunakan 1x kesempatan uji coba gratis kalkulator pajak AI sebelum login. Silakan masuk (login) untuk melanjutkan perhitungan berikutnya tanpa batasan dan menyimpan riwayat analisis Anda."
      : "Masuk untuk menyimpan riwayat percakapan dan melanjutkan konsultasi perpajakan Anda.");

  const resolvedLoginUrl =
    loginUrl ?? (isKalkulator ? "/login?callbackUrl=/kalkulator" : "/login");

  const renderIcon = (size: "modal" | "banner") => {
    if (isKalkulator) {
      return (
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary/10 text-sidebar-primary ${
            size === "modal" ? "h-12 w-12" : "h-9 w-9"
          }`}
        >
          <Calculator className={size === "modal" ? "h-6 w-6" : "h-5 w-5"} />
        </div>
      );
    }

    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ${
          size === "modal" ? "h-10 w-10" : "h-9 w-9"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size === "modal" ? 20 : 18}
          height={size === "modal" ? 20 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      </div>
    );
  };

  if (variant === "modal") {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onDismiss}
      >
        <div
          className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4">
            {renderIcon("modal")}
            <div className="flex-1 min-w-0">
              {isKalkulator && (
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                  Batas Uji Coba Tercapai
                </div>
              )}
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                {resolvedTitle}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {resolvedDescription}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href={resolvedLoginUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground px-6 py-2.5 text-sm font-semibold shadow-sm hover:bg-sidebar-primary/90 transition-all cursor-pointer text-center"
            >
              Masuk Sekarang
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-foreground px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant — inline banner
  return (
    <div className="w-full mt-3">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          {renderIcon("banner")}
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {resolvedTitle}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {isKalkulator
                ? "Anda telah menggunakan 1x kesempatan coba gratis. Masuk untuk menghitung kembali tanpa batas."
                : resolvedDescription}
            </p>
          </div>
          <Link
            href={resolvedLoginUrl}
            className="shrink-0 inline-flex items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-sidebar-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
