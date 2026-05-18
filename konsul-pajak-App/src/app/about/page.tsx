"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicHeader } from "@/components/public-header";
import { BrandText } from "@/components/brand-text";
import { useSession } from "next-auth/react";
import { MessageCircle, Scale, BookOpen, Lock } from "lucide-react";

export default function AboutPage() {
  const { data: session } = useSession();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Apa itu Tanya Pajak AI?",
      a: "Tanya Pajak AI adalah aplikasi chatbot AI yang dirancang untuk membantu Anda memahami peraturan perpajakan di Indonesia. Aplikasi ini menggunakan teknologi AI terbaru dari Google Vertex AI yang di-grounding dengan database peraturan pajak resmi.",
    },
    {
      q: "Apakah jawaban dari Tanya Pajak AI bisa dijadikan dasar hukum?",
      a: "Tidak. Tanya Pajak AI hanyalah alat bantu untuk memahami peraturan perpajakan. Jawaban yang diberikan bersifat informatif dan edukatif, bukan nasihat hukum resmi. Selalu konsultasikan dengan konsultan pajak profesional untuk keputusan yang berkaitan dengan hukum.",
    },
    {
      q: "Bagaimana cara menggunakan Tanya Pajak AI?",
      a: "Anda cukup mengetikkan pertanyaan seputar perpajakan di kolom chat, dan AI kami akan memberikan jawaban yang dilengkapi dengan referensi pasal dan ayat dari peraturan yang relevan. Anda bisa mencoba 1 pertanyaan gratis tanpa login, atau daftar untuk mendapatkan 100 kredit pesan.",
    },
    {
      q: "Berapa biaya menggunakan Tanya Pajak AI?",
      a: "Saat ini Tanya Pajak AI dapat digunakan secara gratis. Setiap pengguna yang mendaftar mendapatkan kredit pesan. Setiap pertanyaan yang normal mengkonsumsi 1 kredit.",
    },
    {
      q: "Peraturan pajak apa saja yang tersedia?",
      a: "Database kami mencakup 40 peraturan perpajakan utama di Indonesia, termasuk UU PPh, UU PPN, UU KUP, UU Harmonisasi Peraturan Perpajakan, dan peraturan turunannya. Anda dapat menjelajahi seluruh peraturan di halaman Direktori.",
    },
    {
      q: "Apakah data percakapan saya aman?",
      a: "Ya. Percakapan Anda disimpan secara aman dan hanya dapat diakses oleh akun Anda sendiri. Kami tidak membagikan data percakapan Anda kepada pihak ketiga.",
    },
  ];

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
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Tentang Tanya Pajak AI</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Asisten AI untuk konsultasi perpajakan Indonesia, didukung oleh teknologi
              Google Vertex AI dengan grounding pada peraturan perpajakan resmi.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 py-12 space-y-16">
          {/* Latar Belakang */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Latar Belakang</h2>
            <div className="prose-chat text-muted-foreground space-y-4">
              <p>
                Tanya Pajak AI dikembangkan sebagai bagian dari proyek skripsi untuk mengatasi
                tantangan aksesibilitas informasi perpajakan di Indonesia. Banyak masyarakat
                dan pelaku usaha yang kesulitan memahami peraturan perpajakan yang kompleks
                dan sering berubah.
              </p>
              <p>
                Dengan memanfaatkan teknologi Retrieval-Augmented Generation (RAG) dari
                Google Vertex AI, Tanya Pajak AI dapat memberikan jawaban yang akurat dan
                dilengkapi dengan referensi langsung ke pasal dan ayat peraturan yang relevan.
              </p>
            </div>
          </section>

          {/* Fitur */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6">Fitur Utama</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: <MessageCircle className="h-6 w-6" />, title: "Konsultasi AI", desc: "Tanyakan pertanyaan seputar perpajakan dan dapatkan jawaban yang komprehensif." },
                { icon: <Scale className="h-6 w-6" />, title: "Referensi Hukum", desc: "Setiap jawaban dilengkapi dengan referensi pasal dan ayat dari peraturan resmi." },
                { icon: <BookOpen className="h-6 w-6" />, title: "Direktori Peraturan", desc: "Jelajahi 40+ peraturan perpajakan Indonesia dalam satu tempat." },
                { icon: <Lock className="h-6 w-6" />, title: "Privasi Terjamin", desc: "Data percakapan Anda aman dan hanya dapat diakses oleh Anda." },
              ].map((f, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow group">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Teknologi */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Teknologi</h2>
            <div className="flex flex-wrap gap-2">
              {["Next.js 15", "tRPC v11", "Prisma", "PostgreSQL", "Google Vertex AI", "Gemini 2.5 Pro", "NextAuth.js", "TailwindCSS", "Docker", "GitHub Actions"].map((tech) => (
                <span key={tech} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6">Pertanyaan yang Sering Ditanyakan</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-medium text-sm text-foreground">{faq.q}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 ml-2 text-muted-foreground transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
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
