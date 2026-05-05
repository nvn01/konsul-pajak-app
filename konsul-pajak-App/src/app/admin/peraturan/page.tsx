'use client'

import { useState } from 'react'
import { api } from 'nvn/trpc/react'
import { AdminLayout } from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PeraturanForm = {
  id?: number
  title: string
  nomor: string
  jenis: string
  topik: string
  tahun: string
  status: string
  deskripsi: string
  url: string
}

const emptyForm: PeraturanForm = {
  title: '', nomor: '', jenis: '', topik: '', tahun: '', status: '', deskripsi: '', url: '',
}

export default function AdminPeraturanPage() {
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PeraturanForm>(emptyForm)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const utils = api.useUtils()
  const query = api.admin.peraturanList.useQuery({ page, limit: 10 }, { retry: false })
  const data = query.data

  const upsertMutation = api.admin.peraturanUpsert.useMutation({
    onSuccess: () => {
      void utils.admin.peraturanList.invalidate()
      setShowForm(false)
      setForm(emptyForm)
    },
  })

  const deleteMutation = api.admin.peraturanDelete.useMutation({
    onSuccess: () => {
      void utils.admin.peraturanList.invalidate()
      setDeletingId(null)
    },
  })

  if (query.isError && query.error.data?.code === 'UNAUTHORIZED') {
    window.location.href = '/admin/login'
    return null
  }

  const handleEdit = (item: PeraturanForm & { id: number }) => {
    setForm(item)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    upsertMutation.mutate(form)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Kelola Peraturan</h2>
        <Button
          onClick={() => { setForm(emptyForm); setShowForm(true) }}
          className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 cursor-pointer"
        >
          + Tambah Peraturan
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{form.id ? 'Edit Peraturan' : 'Tambah Peraturan'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Judul</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nomor</Label>
                  <Input value={form.nomor} onChange={e => setForm({ ...form, nomor: e.target.value })} required />
                </div>
                <div>
                  <Label>Tahun</Label>
                  <Input value={form.tahun} onChange={e => setForm({ ...form, tahun: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jenis</Label>
                  <Input value={form.jenis} onChange={e => setForm({ ...form, jenis: e.target.value })} required placeholder="Undang-undang" />
                </div>
                <div>
                  <Label>Topik</Label>
                  <Input value={form.topik} onChange={e => setForm({ ...form, topik: e.target.value })} required placeholder="PPh, PPN" />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Input value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} required placeholder="Berlaku" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <textarea
                  value={form.deskripsi}
                  onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">
                  Batal
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}
                  className="bg-primary text-primary-foreground cursor-pointer">
                  {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm text-center">
            <p className="text-sm mb-4">Yakin ingin menghapus peraturan ini?</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => setDeletingId(null)} className="cursor-pointer">Batal</Button>
              <Button
                onClick={() => deleteMutation.mutate({ id: deletingId })}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground cursor-pointer"
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Judul</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nomor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Topik</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tahun</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
              )}
              {data?.items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium max-w-[250px]">
                    <span className="line-clamp-1">{item.title}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{item.nomor}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.topik}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.status === 'Berlaku' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status.length > 15 ? item.status.slice(0, 15) + '...' : item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.tahun}</td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-primary hover:underline text-xs cursor-pointer mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="text-destructive hover:underline text-xs cursor-pointer"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada peraturan.</td></tr>
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
