'use client'

import { api } from 'nvn/trpc/react'
import { AdminLayout } from '@/components/admin-layout'

const statCards = [
  { key: 'users', label: 'Total Pengguna', icon: '👤' },
  { key: 'chats', label: 'Total Chat', icon: '💬' },
  { key: 'messages', label: 'Total Pesan', icon: '📝' },
  { key: 'feedbackSuka', label: 'Feedback Suka', icon: '👍' },
  { key: 'feedbackTidakSuka', label: 'Feedback Tidak Suka', icon: '👎' },
  { key: 'peraturan', label: 'Total Peraturan', icon: '📚' },
] as const

export default function AdminDashboardPage() {
  const statsQuery = api.admin.stats.useQuery(undefined, { retry: false })

  if (statsQuery.isError) {
    if (statsQuery.error.data?.code === 'UNAUTHORIZED') {
      window.location.href = '/admin/login'
      return null
    }
  }

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard</h2>

      {statsQuery.isLoading && (
        <p className="text-muted-foreground">Memuat statistik...</p>
      )}

      {statsQuery.data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
            <div
              key={card.key}
              className="bg-card border border-border rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-1">{card.icon}</div>
              <div className="text-2xl font-bold text-foreground">
                {statsQuery.data[card.key]}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
