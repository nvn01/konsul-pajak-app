"use client"

import { useState } from "react"
import { api } from "nvn/trpc/react"
import Link from "next/link"

// Badge color map for topik
function getTopikColor(topik: string): string {
  const map: Record<string, string> = {
    "PPh": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "PPN": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "KUP": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "PBB": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "BPHTB": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    "Bea Meterai": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    "Other": "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400",
  }
  return map[topik] ?? map["Other"]!
}

function getStatusColor(status: string): string {
  if (status === "Berlaku") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
  if (status.includes("Diubah")) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
}

export default function DirektoriPage() {
  const [search, setSearch] = useState("")
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

  const clearFilters = () => {
    setSearch("")
    setFilterTopik("")
    setFilterStatus("")
    setFilterTahun("")
  }

  const hasActiveFilters = search || filterTopik || filterStatus || filterTahun

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              <span className="text-sm">Kembali ke Chat</span>
            </Link>
          </div>
          <h1 className="text-lg font-semibold">Direktori Peraturan</h1>
          <div className="w-[140px]" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari peraturan berdasarkan nama, nomor, atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-3">
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
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {peraturanQuery.isLoading ? (
            "Memuat data peraturan..."
          ) : (
            `Menampilkan ${peraturanList.length} peraturan`
          )}
        </div>

        {/* Cards grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {peraturanList.map((item) => (
            <a
              key={item.id}
              href={item.url || "#"}
              target={item.url ? "_blank" : undefined}
              rel={item.url ? "noopener noreferrer" : undefined}
              className="group rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              {/* Header: Year + Status */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{item.tahun}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors leading-snug">
                {item.title}
              </h3>

              {/* Description */}
              {item.deskripsi && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                  {item.deskripsi}
                </p>
              )}

              {/* Topik badges */}
              <div className="flex flex-wrap gap-1.5">
                {item.topik.split(", ").map((t) => (
                  <span
                    key={t}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTopikColor(t)}`}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* External link indicator */}
              {item.url && (
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  <span>Lihat di BPK</span>
                </div>
              )}
            </a>
          ))}
        </div>

        {/* Empty state */}
        {!peraturanQuery.isLoading && peraturanList.length === 0 && (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground/40 mb-4">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-muted-foreground">Tidak ada peraturan ditemukan dengan filter ini.</p>
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-primary hover:underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
