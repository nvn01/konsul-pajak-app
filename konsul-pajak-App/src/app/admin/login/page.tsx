'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from 'nvn/trpc/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const loginMutation = api.admin.login.useMutation({
    onSuccess: (data) => {
      document.cookie = `admin_session=${data.token}; path=/; max-age=86400; samesite=lax`;
      router.push('/admin/dashboard')
    },
    onError: (err) => {
      setError(err.message || 'Login gagal.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate({ username, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-muted">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-lg border border-border p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-2xl">
              KP
            </div>
            <h1 className="text-2xl font-bold text-primary">Admin Login</h1>
            <p className="text-sm text-muted-foreground">Akses panel administrasi Konsul Pajak</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginMutation.isPending}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Loading...' : 'Login'}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/" className="text-sm text-primary hover:underline">
              Kembali ke Halaman Utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
