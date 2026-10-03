"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { api } from "nvn/trpc/react"

const ALL_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Pengguna", href: "/admin/users" },
  { label: "Chat", href: "/admin/chats" },
  { label: "Feedback", href: "/admin/feedback" },
  { label: "Laporan", href: "/admin/laporan" },
  { label: "Peraturan", href: "/admin/peraturan" },
  { label: "Kuota", href: "/admin/quota" },
]

const STAFF_ALLOWED_HREFS = ["/admin/dashboard", "/admin/users", "/admin/peraturan"]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const authQuery = api.admin.checkAuth.useQuery(undefined, { retry: false })
  const admin = authQuery.data?.admin
  const isStaff = admin?.role === "staff"

  const navItems = isStaff
    ? ALL_NAV_ITEMS.filter((item) => STAFF_ALLOWED_HREFS.includes(item.href))
    : ALL_NAV_ITEMS

  const isForbiddenForStaff =
    isStaff && !STAFF_ALLOWED_HREFS.some((href) => pathname === href || pathname.startsWith(`${href}/`))

  const logoutMutation = api.admin.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/admin/login"
    },
  })

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground border-b border-primary-foreground/10 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <img src="/logo-header.png" alt="KP" className="h-8 w-8 object-contain" />
              <h1 className="text-lg font-bold hidden sm:block">Admin Panel</h1>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <button
            onClick={() => logoutMutation.mutate()}
            className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 mt-3 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {isForbiddenForStaff ? (
            <div className="bg-card border border-destructive/20 rounded-xl p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                ✕
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Akses Ditolak</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Anda tidak memiliki izin untuk mengakses halaman ini. Menu yang dapat diakses: Dashboard, Pengguna, dan Peraturan.
              </p>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  )
}
