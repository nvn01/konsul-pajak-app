'use client'

import { useState } from 'react'
import { api } from 'nvn/trpc/react'
import { AdminLayout } from '@/components/admin-layout'
import { MessageSquare, AlertCircle } from 'lucide-react'

export default function AdminLaporanPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'saran' | 'kesalahan' | undefined>(undefined)

  const query = api.admin.reports.useQuery(
    { page, limit: 10, type: typeFilter },
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
        <h2 className="text-2xl font-bold text-foreground">Laporan & Saran</h2>
        <div className="flex items-center gap-2">
          {(['all', 'saran', 'kesalahan'] as const).map((val) => {
            const isActive = val === 'all' ? !typeFilter : typeFilter === val
            return (
              <button
                key={val}
                onClick={() => { setTypeFilter(val === 'all' ? undefined : val); setPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'border border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {val === 'all' ? 'Semua' : val === 'saran' ? <><MessageSquare className="w-3.5 h-3.5" /> Saran</> : <><AlertCircle className="w-3.5 h-3.5" /> Kesalahan</>}
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
                <th className="px-4 py-3 text-left text-sm font-semibold">Jenis</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Isi Laporan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Konteks Pesan AI</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pengguna</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
              )}
              {data?.items.map((item) => {
                const aiMessageContext = item.message?.content ?? '-'
                return (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.type === 'saran'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.type === 'saran' ? <><MessageSquare className="w-3 h-3" /> Saran</> : <><AlertCircle className="w-3 h-3" /> Kesalahan</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="text-sm line-clamp-3 leading-relaxed">{item.content}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="text-sm text-muted-foreground line-clamp-2 italic">{aiMessageContext}</p>
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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Belum ada laporan.</td></tr>
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
