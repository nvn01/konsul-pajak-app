"use client"

import { useState } from "react"
import { api } from "nvn/trpc/react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { LogOut, Info, Phone, MessageCircle, BookOpen, Calculator, Sparkles } from "lucide-react"

import { PublicHeader } from "@/components/public-header"
import { BrandText } from "@/components/brand-text"
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

          {/* Toggle Tabs */}
          <div className="flex items-center bg-white rounded-full p-1 shadow-sm">
            <Link
              href="/chat"
              className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Tanya Pajak AI
            </Link>
            <div className="px-5 py-2 rounded-full text-sm font-medium text-sidebar-primary-foreground bg-sidebar-primary">
              Direktori
            </div>
          </div>

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
              <DropdownMenuItem disabled className="opacity-50">
                <Calculator className="mr-2 h-4 w-4" />
                <span>Kalkulator Pajak</span>
                <span className="ml-auto text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">Segera</span>
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
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Pencarian"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white transition-colors cursor-pointer hover:opacity-90"
              style={{ backgroundColor: '#1a1a2e' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Cari
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={filterJenis}
              onChange={(e) => { setFilterJenis(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-[140px] truncate"
            >
              <option value="">Semua Jenis</option>
              {filterOptions?.jenis.map((j) => (
                <option key={j} value={j}>{j.length > 25 ? j.substring(0, 25) + '...' : j}</option>
              ))}
            </select>

            <select
              value={filterTopik}
              onChange={(e) => { setFilterTopik(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-[140px] truncate"
            >
              <option value="">Semua Topik</option>
              {filterOptions?.topik.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-[140px] truncate"
            >
              <option value="">Semua Status</option>
              {filterOptions?.status.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filterTahun}
              onChange={(e) => { setFilterTahun(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-[140px] truncate"
            >
              <option value="">Semua Tahun</option>
              {filterOptions?.tahun.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <p className="text-sm text-muted-foreground">
              {peraturanQuery.isLoading
                ? "Memuat data peraturan..."
                : `Menampilkan ${peraturanList.length} dari ${totalCount} Peraturan`}
            </p>
            <div className="flex items-center gap-2 text-xs bg-sidebar-primary/10 text-sidebar-primary px-3 py-1.5 rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ikon (<Sparkles className="w-3 h-3 inline-block" />) menandakan dokumen yang digunakan untuk melatih AI (RAG)</span>
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
                className="group block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-sidebar-primary/40 transition-all"
              >
                {/* Title */}
                <h3 className="font-bold text-foreground mb-2 group-hover:text-sidebar-primary transition-colors flex items-start gap-2">
                  <span>{item.title}</span>
                  {item.jenis.toLowerCase() === "undang-undang" && (
                    <span title="Dokumen ini digunakan untuk melatih AI (RAG)" className="text-sidebar-primary mt-0.5 flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </span>
                  )}
                </h3>

                {/* Description */}
                {item.deskripsi && (
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                    {item.deskripsi}
                  </p>
                )}

                {/* Divider */}
                <div className="border-t border-border pt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {/* Year */}
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    {item.tahun}
                  </span>

                  {/* Topik */}
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    {item.topik}
                  </span>

                  {/* Status */}
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {item.status.length > 15 ? item.status.slice(0, 15) + "..." : item.status}
                  </span>

                  {/* External link */}
                  {item.url && (
                    <span className="flex items-center gap-1.5 ml-auto group-hover:text-sidebar-primary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
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
