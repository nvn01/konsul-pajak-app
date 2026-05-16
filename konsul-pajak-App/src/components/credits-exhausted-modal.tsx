"use client";

import Link from "next/link";

/**
 * CreditsExhaustedModal — shown when a logged-in user runs out of credits.
 */
interface CreditsExhaustedModalProps {
  onClose: () => void;
}

export function CreditsExhaustedModal({ onClose }: CreditsExhaustedModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">
              Kredit Pesan Habis
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Kredit pesan Anda telah habis. Anda tidak dapat mengirim pesan baru sampai kredit Anda diisi ulang.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Silakan hubungi administrator untuk mengisi ulang kredit Anda, atau coba lagi nanti.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground px-5 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Hubungi Kami
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
