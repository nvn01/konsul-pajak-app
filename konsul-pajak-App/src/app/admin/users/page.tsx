'use client'

import { useState } from 'react'
import { api } from 'nvn/trpc/react'
import { AdminLayout } from '@/components/admin-layout'

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const query = api.admin.users.useQuery({ page, limit: 10 }, { retry: false })
  const data = query.data

  if (query.isError && query.error.data?.code === 'UNAUTHORIZED') {
    window.location.href = '/admin/login'
    return null
  }

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-foreground mb-6">Daftar Pengguna</h2>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Chat</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
              )}
              {data?.items.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {user.image ? (
                        <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <span className="font-medium">{user.name ?? '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-center">{user._count.chats}</td>
                  <td className="px-4 py-3 text-sm text-center">{user._count.feedbacks}</td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Belum ada pengguna.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 cursor-pointer hover:bg-muted transition-colors">
            ← Sebelumnya
          </button>
          <span className="text-sm text-muted-foreground">Hal {page} / {data.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 cursor-pointer hover:bg-muted transition-colors">
            Selanjutnya →
          </button>
        </div>
      )}
    </AdminLayout>
  )
}
