'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Mock mutation hook - replace with actual tRPC hook
const useAdminLogin = () => {
  // TODO: Replace with api.admin.login.useMutation()
  return {
    mutate: (data: { username: string; password: string }) => {
      console.log('Admin login:', data)
      // Simulate successful login and redirect
      setTimeout(() => {
        window.location.href = '/admin/dashboard'
      }, 1000)
    },
    isLoading: false,
    isError: false,
    error: null,
  }
}

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const loginMutation = useAdminLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ username, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-muted">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-lg border border-border p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-primary">Admin Login</h1>
            <p className="text-sm text-muted-foreground">Akses dashboard feedback</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loginMutation.isLoading}
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
                disabled={loginMutation.isLoading}
              />
            </div>

            {loginMutation.isError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                Login gagal. Periksa kembali username dan password Anda.
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              disabled={loginMutation.isLoading}
            >
              {loginMutation.isLoading ? 'Loading...' : 'Login'}
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
