'use client'

import { api } from 'nvn/trpc/react'
import { AdminLayout } from '@/components/admin-layout'
import { Users, MessageCircle, FileText, ThumbsUp, ThumbsDown, Scale } from 'lucide-react'
import Link from 'next/link'

const statCards = [
  { key: 'users', label: 'Total Pengguna', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'chats', label: 'Total Chat', icon: MessageCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { key: 'messages', label: 'Total Pesan', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { key: 'feedbackSuka', label: 'Feedback Suka', icon: ThumbsUp, color: 'text-green-500', bg: 'bg-green-500/10' },
  { key: 'feedbackTidakSuka', label: 'Feedback Tidak Suka', icon: ThumbsDown, color: 'text-red-500', bg: 'bg-red-500/10' },
  { key: 'peraturan', label: 'Total Peraturan', icon: Scale, color: 'text-orange-500', bg: 'bg-orange-500/10' },
] as const

export default function AdminDashboardPage() {
  const statsQuery = api.admin.stats.useQuery(undefined, { retry: false })
  const recentChatsQuery = api.admin.chats.useQuery({ page: 1, limit: 5 }, { retry: false })
  const recentFeedbackQuery = api.admin.feedback.useQuery({ page: 1, limit: 5 }, { retry: false })

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
        <p className="text-muted-foreground mb-6">Memuat statistik...</p>
      )}

      {statsQuery.data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.key}
                className="bg-card border border-border rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
              >
                <div className={`p-3 rounded-full mb-3 ${card.bg} ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {statsQuery.data[card.key]}
                </div>
                <div className="text-xs font-medium text-muted-foreground">{card.label}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Chats */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Chat Terbaru
            </h3>
            <Link href="/admin/chats" className="text-xs text-primary hover:underline">Lihat Semua</Link>
          </div>
          <div className="p-4 flex-1">
            {recentChatsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : recentChatsQuery.data?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada chat.</p>
            ) : (
              <div className="space-y-4">
                {recentChatsQuery.data?.items.map(chat => (
                  <div key={chat.id} className="flex items-start justify-between gap-4 border-b border-border/50 last:border-0 pb-4 last:pb-0">
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{chat.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{chat.user.name ?? chat.user.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(chat.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                      </p>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-block mt-1">
                        {chat._count.messages} pesan
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <ThumbsUp className="w-4 h-4" /> Feedback Terbaru
            </h3>
            <Link href="/admin/feedback" className="text-xs text-primary hover:underline">Lihat Semua</Link>
          </div>
          <div className="p-4 flex-1">
            {recentFeedbackQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : recentFeedbackQuery.data?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada feedback.</p>
            ) : (
              <div className="space-y-4">
                {recentFeedbackQuery.data?.items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 border-b border-border/50 last:border-0 pb-4 last:pb-0">
                    <div className="shrink-0 mt-0.5">
                      {item.rating === 'suka' ? (
                        <div className="bg-green-100 text-green-700 p-1.5 rounded-full"><ThumbsUp className="w-3.5 h-3.5" /></div>
                      ) : (
                        <div className="bg-red-100 text-red-700 p-1.5 rounded-full"><ThumbsDown className="w-3.5 h-3.5" /></div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                        <span className="font-medium text-foreground">{item.user.name ?? item.user.email}</span> bertanya:
                      </p>
                      <p className="text-sm line-clamp-2 italic text-foreground/80 bg-muted/50 p-2 rounded-md border border-border/50">
                        "{item.message.chat.messages[0]?.content ?? '-'}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
