"use client"

import { useState } from "react"
import { api } from "nvn/trpc/react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  BookOpen,
  Briefcase,
  Calculator,
  CalendarDays,
  ExternalLink,
  FileText,
  Filter,
  Info,
  LogOut,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
} from "lucide-react"

import { PublicHeader } from "@/components/public-header"
import { BrandText } from "@/components/brand-text"
import { AuthFeatureTabs } from "@/components/auth-feature-tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DirektoriPage() {
  const { data: session } = useSession()
  const creditsQuery = api.chat.getCredits.useQuery(undefined, {
    enabled: !!session,
  })
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [filterJenis, setFilterJenis] = useState("")
  const [filterTopik, setFilterTopik] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterTahun, setFilterTahun] = useState("")

  const [page, setPage] = useState(1)

  const filterOptionsQuery = api.peraturan.filterOptions.useQuery()

  const peraturanQuery = api.peraturan.list.useQuery({
    search: search || undefined,
    jenis: filterJenis || undefined,
    topik: filterTopik || undefined,
    status: filterStatus || undefined,
    tahun: filterTahun || undefined,
    page,
    limit: 10,
  })

  const peraturanList = peraturanQuery.data?.items ?? []
  const totalCount = peraturanQuery.data?.totalCount ?? 0
  const totalPages = peraturanQuery.data?.totalPages ?? 1
  const filterOptions = filterOptionsQuery.data

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleLogout = () => {
    void signOut({ callbackUrl: "/" })
  }

  const clearFilters = () => {
    setSearch("")
    setSearchInput("")
    setFilterJenis("")
    setFilterTopik("")
    setFilterStatus("")
    setFilterTahun("")
    setPage(1)
  }

  const hasActiveFilters = search || filterJenis || filterTopik || filterStatus || filterTahun

  // Helper for pagination numbers
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const displayedCountText = peraturanQuery.isLoading
    ? "Memuat data peraturan..."
    : `Total Peraturan KUP (${totalCount})`

  return (
    <div className="flex h-screen flex-col">
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

          <AuthFeatureTabs active="direktori" />

          {/* User avatar dropdown */}
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
                <div className="flex flex-col space-y-1.5">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name}
                  </p>
                  <p className="text-muted-foreground text-xs leading-none">
                    {session?.user?.email}
                  </p>
                  {creditsQuery.data && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-sidebar-primary bg-sidebar-primary/10 px-2.5 py-1 rounded w-fit font-semibold">
                      <span>Sisa Kredit: {creditsQuery.data.credits} pesan</span>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Hidden for now: pricing/credit purchase entry point is temporarily disabled. */}
              {/* <DropdownMenuItem className="cursor-pointer font-semibold text-sidebar-primary focus:text-sidebar-primary focus:bg-sidebar-primary/5" asChild>
                <Link href="/pricing">
                  <Coins className="mr-2 h-4 w-4" />
                  <span>Beli Kredit</span>
                </Link>
              </DropdownMenuItem> */}
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
                  <span>Kalkulator (Development)</span>
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

      {/* Main Content - no sidebar */}
      <main className="flex-1 overflow-y-auto bg-[#f7f7f8]">
        <section className="relative overflow-hidden border-t-4 border-sidebar-primary bg-[#102a55] px-4 pb-28 pt-20 text-primary-foreground shadow-[inset_0_18px_34px_rgba(0,0,0,0.16)] md:pb-32 md:pt-24">
          <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:32px_32px]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-sidebar-primary/30 bg-white/10 px-4 py-2 text-sm font-semibold text-sidebar-primary shadow-sm">
              <BookOpen className="h-4 w-4" />
              <span>Direktori KUP</span>
            </div>
            <h1 className="font-[var(--font-manrope)] text-4xl font-extrabold tracking-normal text-white md:text-5xl">
              Direktori Peraturan <span className="text-sidebar-primary">Perpajakan</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-primary-foreground/75 md:text-lg">
              Ketentuan Umum dan Tata Cara Perpajakan untuk membantu menelusuri dasar administrasi perpajakan.
            </p>
          </div>
        </section>

        <div className="mx-auto -mt-12 max-w-4xl px-4 pb-10">
          <section className="relative rounded-2xl border border-border bg-white p-5 shadow-xl shadow-primary/10 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari peraturan KUP, pasal, atau topik perpajakan..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="h-14 w-full rounded-xl border border-border bg-background pl-12 pr-4 text-sm shadow-inner shadow-muted/40 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleSearch}
                className="h-14 rounded-xl bg-primary px-7 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/95 md:min-w-40"
              >
                Cari Peraturan
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filter:</span>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={filterJenis}
                  onChange={(e) => { setFilterJenis(e.target.value); setPage(1); }}
                  className="h-12 rounded-xl border border-border bg-white px-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Semua Jenis</option>
                  {filterOptions?.jenis.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>

                <select
                  value={filterTahun}
                  onChange={(e) => { setFilterTahun(e.target.value); setPage(1); }}
                  className="h-12 rounded-xl border border-border bg-white px-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Semua Tahun</option>
                  {filterOptions?.tahun.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <select
                  value={filterTopik}
                  onChange={(e) => { setFilterTopik(e.target.value); setPage(1); }}
                  className="h-12 rounded-xl border border-border bg-white px-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Semua Topik</option>
                  {filterOptions?.topik.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="h-12 rounded-xl border border-border bg-white px-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Semua Status</option>
                  {filterOptions?.status.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-12 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>
          </section>

          <div className="mt-11 mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{displayedCountText}</h2>
              {!peraturanQuery.isLoading && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Menampilkan {peraturanList.length} peraturan pada halaman ini
                </p>
              )}
            </div>
            <div className="flex w-fit items-center gap-2 rounded-full bg-sidebar-primary/10 px-3 py-1.5 text-xs text-sidebar-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Dokumen RAG ditandai ikon kilau</span>
            </div>
          </div>

          {/* Peraturan List */}
          <div className="space-y-3">
            {peraturanList.map((item) => (
              <a
                key={item.id}
                href={item.url || "#"}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noopener noreferrer" : undefined}
                className="group relative block overflow-hidden rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:border-sidebar-primary/40 hover:shadow-lg"
              >
                <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-muted/80" />
                {/* Title */}
                <h3 className="relative mb-2 flex items-start gap-2 text-xl font-extrabold text-foreground transition-colors group-hover:text-primary">
                  <span>{item.title}</span>
                  {item.jenis.toLowerCase() === "undang-undang" && (
                    <span title="Dokumen ini digunakan untuk melatih AI (RAG)" className="mt-1 flex-shrink-0 text-sidebar-primary">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  )}
                </h3>

                <div className="relative mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {item.topik || item.jenis}
                </div>

                {/* Description */}
                {item.deskripsi && (
                  <p className="relative mb-5 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {item.deskripsi}
                  </p>
                )}

                {/* Divider */}
                <div className="relative flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  {/* Year */}
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {item.tahun}
                  </span>

                  {/* Topik */}
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    {item.jenis}
                  </span>

                  {/* Status */}
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {item.status.length > 15 ? item.status.slice(0, 15) + "..." : item.status}
                  </span>

                  {/* External link */}
                  {item.url && (
                    <span className="flex items-center gap-1.5 ml-auto group-hover:text-sidebar-primary transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Lihat di BPK
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>

          {/* Empty state */}
          {!peraturanQuery.isLoading && peraturanList.length === 0 && (
            <div className="text-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground/30 mb-4">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <p className="text-muted-foreground mb-2">Tidak ada peraturan ditemukan.</p>
              <button
                onClick={clearFilters}
                className="text-sm text-sidebar-primary hover:underline cursor-pointer"
              >
                Reset filter
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pb-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
              >
                ← Sebelumnya
              </button>

              {getPageNumbers().map((p, idx) => (
                <button
                  key={`page-${p}-${idx}`}
                  onClick={() => typeof p === "number" && setPage(p)}
                  disabled={typeof p !== "number"}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : typeof p === "number"
                      ? "border border-border hover:bg-muted cursor-pointer"
                      : "cursor-default text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
              >
                Selanjutnya →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
