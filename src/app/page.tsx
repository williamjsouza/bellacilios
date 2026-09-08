'use client'

import { useEffect, useState, useCallback } from 'react'
import { Toaster } from '@/components/ui/toaster'
import LoginScreen from '@/components/app/login-screen'
import AppShell from '@/components/app/app-shell'
import { apiPost } from '@/lib/use-fetch'

type SessionUser = { id: string; name: string; email: string; role: string } | null

export default function Home() {
  const [user, setUser] = useState<SessionUser>(undefined as any)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const j = await res.json()
        setUser(j.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSession() }, [loadSession])

  const onLogin = async (email: string, password: string) => {
    const r = await apiPost('/api/auth/login', { email, password })
    await loadSession()
    return r
  }

  const onLogout = async () => {
    await apiPost('/api/auth/logout', {})
    setUser(null)
  }

  if (loading || user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando Studio Jéssica Novais ERP…</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginScreen onLogin={onLogin} />
  return <AppShell user={user} onLogout={onLogout} />
}
