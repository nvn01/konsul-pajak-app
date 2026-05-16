"use client"

import { useState } from "react"
import { api } from "nvn/trpc/react"
import { AdminLayout } from "@/components/admin-layout"

export default function AdminQuotaPage() {
  // ─── Global Config ─────────────────────────────────
  const configQuery = api.admin.quotaConfig.useQuery()
  const updateConfigMutation = api.admin.updateQuotaConfig.useMutation({
    onSuccess: () => configQuery.refetch(),
  })

  const [config, setConfig] = useState<{
    defaultCredits: number
    guestMessageLimit: number
    spamTimeWindowSec: number
    minMessageLength: number
  } | null>(null)

  // Initialize form when data loads
  if (configQuery.data && !config) {
    setConfig({
      defaultCredits: configQuery.data.defaultCredits,
      guestMessageLimit: configQuery.data.guestMessageLimit,
      spamTimeWindowSec: configQuery.data.spamTimeWindowSec,
      minMessageLength: configQuery.data.minMessageLength,
    })
  }

  // ─── User Credits ──────────────────────────────────
  const [userPage, setUserPage] = useState(1)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const userCreditsQuery = api.admin.userCredits.useQuery({ page: userPage, limit: 10, flaggedOnly })

  const adjustCreditsMutation = api.admin.adjustUserCredits.useMutation({
    onSuccess: () => userCreditsQuery.refetch(),
  })
  const toggleFlagMutation = api.admin.toggleUserFlag.useMutation({
    onSuccess: () => userCreditsQuery.refetch(),
  })
  const resetQuotaMutation = api.admin.resetUserQuota.useMutation({
    onSuccess: () => userCreditsQuery.refetch(),
  })

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editCredits, setEditCredits] = useState("")

  const handleSaveConfig = () => {
    if (!config) return
    updateConfigMutation.mutate(config)
  }

  const handleAdjustCredits = (userId: string) => {
    const credits = parseInt(editCredits)
    if (isNaN(credits) || credits < 0) return
    adjustCreditsMutation.mutate({ userId, credits })
    setEditingUserId(null)
    setEditCredits("")
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Kuota</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola pengaturan kredit global dan kuota pengguna individual.
          </p>
        </div>

        {/* ─── Global Settings ───────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Pengaturan Global</h2>
          {config ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Kredit Default (user baru)
                </label>
                <input
                  type="number"
                  value={config.defaultCredits}
                  onChange={(e) => setConfig({ ...config, defaultCredits: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Batas Pesan Guest
                </label>
                <input
                  type="number"
                  value={config.guestMessageLimit}
                  onChange={(e) => setConfig({ ...config, guestMessageLimit: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Jendela Waktu Spam (detik)
                </label>
                <input
                  type="number"
                  value={config.spamTimeWindowSec}
                  onChange={(e) => setConfig({ ...config, spamTimeWindowSec: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pesan yang dikirim dalam jendela waktu ini dianggap spam.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Panjang Pesan Minimum
                </label>
                <input
                  type="number"
                  value={config.minMessageLength}
                  onChange={(e) => setConfig({ ...config, minMessageLength: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pesan lebih pendek dari ini dianggap spam.
                </p>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={updateConfigMutation.isPending}
                  className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {updateConfigMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
                {updateConfigMutation.isSuccess && (
                  <span className="ml-3 text-sm text-green-600">✓ Tersimpan</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Memuat pengaturan...</p>
          )}
        </div>

        {/* ─── User Credits Table ────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Kredit Pengguna</h2>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => { setFlaggedOnly(e.target.checked); setUserPage(1) }}
                className="rounded"
              />
              Hanya yang diflag
            </label>
          </div>

          {userCreditsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat data pengguna...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Pengguna</th>
                      <th className="pb-2 font-medium text-muted-foreground">Kredit</th>
                      <th className="pb-2 font-medium text-muted-foreground">Biaya/Pesan</th>
                      <th className="pb-2 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userCreditsQuery.data?.items.map((user) => (
                      <tr key={user.id} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="font-medium text-foreground">{user.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </td>
                        <td className="py-3">
                          {editingUserId === user.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editCredits}
                                onChange={(e) => setEditCredits(e.target.value)}
                                className="w-20 rounded border border-border bg-background px-2 py-1 text-xs"
                                onKeyDown={(e) => e.key === "Enter" && handleAdjustCredits(user.id)}
                              />
                              <button
                                type="button"
                                onClick={() => handleAdjustCredits(user.id)}
                                className="text-xs text-primary hover:underline cursor-pointer"
                              >✓</button>
                              <button
                                type="button"
                                onClick={() => { setEditingUserId(null); setEditCredits("") }}
                                className="text-xs text-muted-foreground hover:underline cursor-pointer"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setEditingUserId(user.id); setEditCredits(String(user.credits)) }}
                              className="font-mono text-foreground hover:text-primary cursor-pointer"
                            >
                              {user.credits}
                            </button>
                          )}
                        </td>
                        <td className="py-3 font-mono">{user.creditCostPerMsg}x</td>
                        <td className="py-3">
                          {user.isFlagged ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
                              🚩 Diflag
                            </span>
                          ) : user.spamStreak > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 text-yellow-700 px-2 py-0.5 text-xs font-medium">
                              ⚠ Spam: {user.spamStreak}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Normal</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFlagMutation.mutate({ userId: user.id })}
                              disabled={toggleFlagMutation.isPending}
                              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                              title={user.isFlagged ? "Unflag" : "Flag"}
                            >
                              {user.isFlagged ? "Unflag" : "🚩 Flag"}
                            </button>
                            <button
                              type="button"
                              onClick={() => resetQuotaMutation.mutate({ userId: user.id })}
                              disabled={resetQuotaMutation.isPending}
                              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Reset kuota"
                            >
                              ↺ Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(userCreditsQuery.data?.totalPages ?? 1) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40 cursor-pointer"
                  >
                    ← Sebelumnya
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Halaman {userPage} dari {userCreditsQuery.data?.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserPage((p) => Math.min(userCreditsQuery.data?.totalPages ?? 1, p + 1))}
                    disabled={userPage === (userCreditsQuery.data?.totalPages ?? 1)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Selanjutnya →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
