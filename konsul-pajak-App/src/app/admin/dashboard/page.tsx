'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Mock query hook - replace with actual tRPC hook
const useGetFeedback = () => {
  // TODO: Replace with api.admin.getFeedback.useQuery()
  return {
    data: [
      {
        id: 'f1',
        rating: 'suka',
        userQuestion: 'Bagaimana cara menghitung PPh 21?',
        systemAnswer: 'PPh 21 dihitung berdasarkan penghasilan bruto...',
        timestamp: new Date('2025-01-15T10:30:00'),
      },
      {
        id: 'f2',
        rating: 'tidak_suka',
        userQuestion: 'Kapan batas waktu lapor SPT?',
        systemAnswer: 'Batas waktu lapor SPT adalah 31 Maret untuk pribadi...',
        timestamp: new Date('2025-01-14T15:20:00'),
      },
      {
        id: 'f3',
        rating: 'suka',
        userQuestion: 'Apa itu NPWP?',
        systemAnswer: 'NPWP adalah Nomor Pokok Wajib Pajak...',
        timestamp: new Date('2025-01-13T09:15:00'),
      },
    ],
    isLoading: false,
    isSuccess: true,
    isError: false,
  }
}

export default function AdminDashboardPage() {
  const [filter, setFilter] = useState<'all' | 'suka' | 'tidak_suka'>('all')
  const feedbackQuery = useGetFeedback()

  const filteredData = feedbackQuery.data?.filter((item) => {
    if (filter === 'all') return true
    return item.rating === filter
  })

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 border-b border-primary-foreground/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center font-bold text-accent-foreground">
              KP
            </div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              Logout
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-primary">Dashboard Feedback Konsul Pajak</h2>
            <div className="w-64">
              <Select value={filter} onValueChange={(value: 'all' | 'suka' | 'tidak_suka') => setFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="suka">Suka</SelectItem>
                  <SelectItem value="tidak_suka">Tidak Suka</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {feedbackQuery.isLoading && (
            <div className="text-center py-12 text-muted-foreground">Loading data...</div>
          )}

          {feedbackQuery.isError && (
            <div className="text-center py-12 text-destructive">
              Error loading feedback data
            </div>
          )}

          {feedbackQuery.isSuccess && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Rating</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Pertanyaan Pengguna</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Jawaban Sistem</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredData?.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${item.rating === 'suka'
                                ? 'bg-accent/20 text-accent-foreground'
                                : 'bg-destructive/20 text-destructive'
                              }`}
                          >
                            {item.rating === 'suka' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 10v12" />
                                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 14V2" />
                                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                              </svg>
                            )}
                            {item.rating === 'suka' ? 'Suka' : 'Tidak Suka'}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-sm text-foreground line-clamp-2">{item.userQuestion}</div>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {item.systemAnswer}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground">
                            {item.timestamp.toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                            <br />
                            {item.timestamp.toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredData?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Tidak ada feedback untuk filter ini
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
