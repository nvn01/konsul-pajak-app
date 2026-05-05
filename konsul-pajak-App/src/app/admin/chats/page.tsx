'use client'

import { useState } from 'react'
import { api } from 'nvn/trpc/react'
import { AdminLayout } from '@/components/admin-layout'

import { ThumbsUp, ThumbsDown } from 'lucide-react'

export default function AdminChatsPage() {
  const [page, setPage] = useState(1)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  const query = api.admin.chats.useQuery({ page, limit: 10 }, { retry: false })
  const detailQuery = api.admin.chatDetail.useQuery(
    { chatId: selectedChatId! },
    { enabled: !!selectedChatId, retry: false }
  )
  const data = query.data

  if (query.isError && query.error.data?.code === 'UNAUTHORIZED') {
    window.location.href = '/admin/login'
    return null
  }

  // Detail view
  if (selectedChatId && detailQuery.data) {
    const chat = detailQuery.data
    return (
      <AdminLayout>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedChatId(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            ← Kembali
          </button>
          <h2 className="text-2xl font-bold text-foreground">{chat.title}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Oleh: {chat.user.name ?? chat.user.email} · {new Date(chat.createdAt).toLocaleDateString('id-ID')}
        </p>

        <div className="space-y-3 max-w-3xl">
          {chat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-4 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary/10 border border-primary/20 ml-8'
                  : 'bg-card border border-border mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${msg.role === 'user' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {msg.role === 'user' ? 'Pengguna' : 'Asisten'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.feedback && (
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    msg.feedback.rating === 'suka'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {msg.feedback.rating === 'suka' ? <><ThumbsUp className="w-3 h-3" /> Suka</> : <><ThumbsDown className="w-3 h-3" /> Tidak Suka</>}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content.substring(0, 500)}{msg.content.length > 500 ? '...' : ''}</p>
            </div>
          ))}
        </div>
      </AdminLayout>
    )
  }

  // List view
  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-foreground mb-6">Daftar Chat</h2>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Judul</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pengguna</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Pesan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
              )}
              {data?.items.map((chat) => (
                <tr
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{chat.title}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{chat.user.name ?? chat.user.email}</td>
                  <td className="px-4 py-3 text-sm text-center">{chat._count.messages}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(chat.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Belum ada chat.</td></tr>
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
