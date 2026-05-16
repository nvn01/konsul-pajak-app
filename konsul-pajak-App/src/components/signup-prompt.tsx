"use client";

import Link from "next/link";

/**
 * SignupPrompt — popup/banner shown to guest users after their 1 free message.
 * Styled similar to the ChatGPT-style "Sign up to keep chatting" banner.
 */
interface SignupPromptProps {
  /** Whether to show as a fixed overlay modal (true) or inline banner (false) */
  variant?: "modal" | "banner";
}

export function SignupPrompt({ variant = "banner" }: SignupPromptProps) {
  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">
                Daftar untuk melanjutkan chat
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Daftar sekarang untuk mendapatkan 100 kredit pesan gratis dan menyimpan riwayat percakapan Anda.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
            >
              Daftar Gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card text-foreground px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Sudah punya akun? Masuk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant — inline at the bottom of the chat
  return (
    <div className="mx-auto max-w-4xl mt-4">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">
              Daftar untuk melanjutkan chat
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daftar sekarang untuk mendapatkan 100 kredit pesan gratis dan menyimpan riwayat percakapan.
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-card text-foreground px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Daftar Gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
