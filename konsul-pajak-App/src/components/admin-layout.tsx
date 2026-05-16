"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { api } from "nvn/trpc/react"

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Pengguna", href: "/admin/users" },
  { label: "Chat", href: "/admin/chats" },
  { label: "Feedback", href: "/admin/feedback" },
  { label: "Laporan", href: "/admin/laporan" },
  { label: "Peraturan", href: "/admin/peraturan" },
  { label: "Kuota", href: "/admin/quota" },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const logoutMutation = api.admin.logout.useMutation({
    onSuccess: () => {
      document.cookie = "admin_session=; path=/; max-age=0";
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
              <div className="bg-primary-foreground/20 flex h-8 w-8 items-center justify-center rounded-md font-bold text-sm">
                KP
              </div>
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
          {children}
        </div>
      </main>
    </div>
  )
}
