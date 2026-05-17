"use client";

import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { BrandText } from "@/components/brand-text";
import { useSession } from "next-auth/react";

export default function ContactPage() {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      {!session ? (
        <PublicHeader />
      ) : (
        <header className="bg-primary text-primary-foreground border-primary-foreground/10 border-b px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-header.png" alt="KP" className="h-8 w-8 object-contain" />
              <BrandText className="text-lg" />
            </Link>
            <Link href="/chat" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
              ← Kembali ke Chat
            </Link>
          </div>
        </header>
      )}

      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Hubungi Kami</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Punya pertanyaan, saran, atau menemukan masalah? Jangan ragu untuk menghubungi kami.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Informasi Kontak</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">Email</h3>
                    <a href="mailto:konsulpajak@novn.my.id" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      konsulpajak@novn.my.id
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">GitHub</h3>
                    <a href="https://github.com/novn01" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      github.com/novn01
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">Website</h3>
                    <a href="https://chat.novn.my.id" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      chat.novn.my.id
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Tautan Cepat</h2>
              <div className="space-y-3">
                <Link href="/about" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all group">
                  <span className="text-lg">📖</span>
                  <div>
                    <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">Tentang Aplikasi</div>
                    <div className="text-xs text-muted-foreground">Pelajari lebih lanjut tentang Tanya Pajak AI</div>
                  </div>
                </Link>
                <Link href="/chat" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all group">
                  <span className="text-lg">💬</span>
                  <div>
                    <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">Mulai Konsultasi</div>
                    <div className="text-xs text-muted-foreground">Tanyakan pertanyaan seputar perpajakan</div>
                  </div>
                </Link>
                <Link href="/direktori" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all group">
                  <span className="text-lg">📚</span>
                  <div>
                    <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">Direktori Peraturan</div>
                    <div className="text-xs text-muted-foreground">Jelajahi peraturan perpajakan Indonesia</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Tanya Pajak AI. Dikembangkan sebagai proyek skripsi.
        </div>
      </footer>
    </div>
  );
}
