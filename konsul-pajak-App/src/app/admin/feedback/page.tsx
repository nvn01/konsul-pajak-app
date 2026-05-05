'use client'

import { useState } from 'react'
import { api } from 'nvn/trpc/react'
import { AdminLayout } from '@/components/admin-layout'

export default function AdminFeedbackPage() {
  const [page, setPage] = useState(1)
  const [ratingFilter, setRatingFilter] = useState<'suka' | 'tidak_suka' | undefined>(undefined)

  const query = api.admin.feedback.useQuery(
    { page, limit: 10, rating: ratingFilter },
    { retry: false }
  )
  const data = query.data

  if (query.isError && query.error.data?.code === 'UNAUTHORIZED') {
    window.location.href = '/admin/login'
    return null
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Feedback</h2>
        <div className="flex items-center gap-2">
          {(['all', 'suka', 'tidak_suka'] as const).map((val) => {
            const isActive = val === 'all' ? !ratingFilter : ratingFilter === val
            return (
              <button
                key={val}
                onClick={() => { setRatingFilter(val === 'all' ? undefined : val); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {val === 'all' ? 'Semua' : val === 'suka' ? '👍 Suka' : '👎 Tidak Suka'}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Rating</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pertanyaan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Jawaban AI</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pengguna</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
              )}
              {data?.items.map((item) => {
                const userQuestion = item.message.chat.messages[0]?.content ?? '-'
                const aiAnswer = item.message.content
                return (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.rating === 'suka'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {item.rating === 'suka' ? '👍 Suka' : '👎 Tidak Suka'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm line-clamp-2">{userQuestion}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[300px]">
                      <p className="text-sm text-muted-foreground line-clamp-2">{aiAnswer}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {item.user.name ?? item.user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
              {data?.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Belum ada feedback.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
