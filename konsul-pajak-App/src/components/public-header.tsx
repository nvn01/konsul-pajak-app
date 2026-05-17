"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { BrandText } from "@/components/brand-text";

/**
 * PublicHeader — shared navigation for non-logged-in users.
 * Used on /chat (guest), /about, /contact, /direktori (guest).
 * Shows: KP logo, Tentang Aplikasi, Kontak, Fitur (dropdown), Masuk button.
 */
export function PublicHeader() {
  const { data: session } = useSession();
  const [isFiturOpen, setIsFiturOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If logged in, don't show this header (parent should render the auth header)
  if (session) return null;

  return (
    <header className="bg-primary text-primary-foreground border-primary-foreground/10 border-b px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-primary-foreground/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>

          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-header.png" alt="KP" className="h-8 w-8 object-contain" />
            <BrandText className="text-lg hidden sm:block" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/about"
            className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            Tentang Aplikasi
          </Link>

          <Link
            href="/contact"
            className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            Kontak
          </Link>

          {/* Fitur Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors cursor-pointer"
              onClick={() => setIsFiturOpen(!isFiturOpen)}
              onBlur={() => setTimeout(() => setIsFiturOpen(false), 200)}
            >
              Fitur
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
                className={`transition-transform duration-200 ${isFiturOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isFiturOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-border bg-card text-card-foreground shadow-lg py-1 z-50">
                <Link
                  href="/chat"
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                  onClick={() => setIsFiturOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  </svg>
                  <div>
                    <div className="font-medium">Konsultasi AI</div>
                    <div className="text-xs text-muted-foreground">Tanya seputar perpajakan</div>
                  </div>
                </Link>
                <Link
                  href="/direktori"
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                  onClick={() => setIsFiturOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                  </svg>
                  <div>
                    <div className="font-medium">Direktori Peraturan</div>
                    <div className="text-xs text-muted-foreground">Jelajahi undang-undang pajak</div>
                  </div>
                </Link>
                <div className="flex items-center gap-3 px-4 py-3 text-sm opacity-50 cursor-default">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="20" x="4" y="2" rx="2" />
                    <line x1="8" x2="16" y1="6" y2="6" />
                    <line x1="16" x2="16" y1="14" y2="18" />
                    <path d="M16 10h.01" />
                    <path d="M12 10h.01" />
                    <path d="M8 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M8 14h.01" />
                    <path d="M12 18h.01" />
                    <path d="M8 18h.01" />
                  </svg>
                  <div>
                    <div className="font-medium">Kalkulator Pajak</div>
                    <div className="text-xs text-muted-foreground">Segera hadir</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Sign In Button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-white text-primary px-5 py-2 text-sm font-semibold shadow-sm hover:bg-white/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" x2="3" y1="12" y2="12" />
          </svg>
          Masuk
        </Link>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden mt-4 pt-4 border-t border-primary-foreground/10 space-y-1">
          <Link
            href="/about"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Tentang Aplikasi
          </Link>
          <Link
            href="/contact"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Kontak
          </Link>
          <div className="px-3 py-1 text-xs font-medium text-primary-foreground/50 uppercase tracking-wider">Fitur</div>
          <Link
            href="/chat"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Konsultasi AI
          </Link>
          <Link
            href="/direktori"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Direktori Peraturan
          </Link>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground/40 cursor-default">
            <span>Kalkulator Pajak</span>
            <span className="text-[10px] rounded-full bg-primary-foreground/10 px-1.5 py-0.5">Segera</span>
          </div>
        </nav>
      )}
    </header>
  );
}
