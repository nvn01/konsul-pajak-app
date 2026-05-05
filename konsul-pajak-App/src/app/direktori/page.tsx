"use client"

import { useState } from "react"
import { api } from "nvn/trpc/react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"

export default function DirektoriPage() {
  const { data: session } = useSession()
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [filterTopik, setFilterTopik] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterTahun, setFilterTahun] = useState("")

  const filterOptionsQuery = api.peraturan.filterOptions.useQuery()

  const peraturanQuery = api.peraturan.list.useQuery({
    search: search || undefined,
    topik: filterTopik || undefined,
    status: filterStatus || undefined,
    tahun: filterTahun || undefined,
  })

  const peraturanList = peraturanQuery.data ?? []
  const filterOptions = filterOptionsQuery.data

  const handleSearch = () => {
    setSearch(searchInput)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const clearFilters = () => {
    setSearch("")
    setSearchInput("")
    setFilterTopik("")
    setFilterStatus("")
    setFilterTahun("")
  }

  const hasActiveFilters = search || filterTopik || filterStatus || filterTahun

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header - same style as chat */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3" style={{ backgroundColor: '#00CF9B' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 font-bold text-white text-sm">
            KP
          </div>
          <h1 className="text-lg font-bold text-white hidden sm:block">Konsul Pajak</h1>
        </div>

        {/* Toggle Tabs */}
        <div className="flex items-center bg-white rounded-full p-1 shadow-sm">
          <Link
            href="/chat"
            className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Konsul Pajak
          </Link>
          <div className="px-5 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: '#00CF9B' }}>
            Direktori
          </div>
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          {session?.user && (
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
              {session.user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
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
              value={filterTopik}
              onChange={(e) => setFilterTopik(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Semua Topik</option>
              {filterOptions?.topik.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Semua Status</option>
              {filterOptions?.status.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

          {/* Results count + sort */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {peraturanQuery.isLoading
                ? "Memuat data peraturan..."
                : `Menampilkan ${peraturanList.length} Peraturan`}
            </p>
          </div>

          {/* Peraturan List */}
          <div className="space-y-3">
            {peraturanList.map((item) => (
              <a
                key={item.id}
                href={item.url || "#"}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noopener noreferrer" : undefined}
                className="group block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all"
              >
                {/* Title */}
                <h3 className="font-bold text-foreground mb-2 group-hover:text-[#00CF9B] transition-colors">
                  {item.title}
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

                  {/* Share / External link */}
                  {item.url && (
                    <span className="flex items-center gap-1.5 ml-auto group-hover:text-[#00CF9B] transition-colors">
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
                className="text-sm hover:underline cursor-pointer"
                style={{ color: '#00CF9B' }}
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
