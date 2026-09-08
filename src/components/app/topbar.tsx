'use client'

import { useState, useEffect } from 'react'
import { Menu, Bell, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GlobalSearch from './global-search'
import { useAppStore } from '@/lib/store'
import { NAV_MODULES } from './nav-config'
import { Badge } from '@/components/ui/badge'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { formatDateTime } from '@/lib/format'

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { activeModule } = useAppStore()
  const [notifications, setNotifications] = useState<any[]>([])

  const mod = NAV_MODULES.find((m) => m.key === activeModule)

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(j => setNotifications(j.notifications || [])).catch(() => {})
    const t = setInterval(() => fetch('/api/notifications').then(r => r.json()).then(j => setNotifications(j.notifications || [])).catch(() => {}), 60000)
    return () => clearInterval(t)
  }, [])

  const unread = notifications.filter(n => !n.read)

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {})
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-4 h-4 text-primary hidden sm:block" />
        <h1 className="font-semibold text-base sm:text-lg truncate">{mod?.label ?? 'Dashboard'}</h1>
      </div>

      <div className="flex-1 flex justify-center px-2">
        <div className="hidden md:block w-full max-w-md">
          <GlobalSearch />
        </div>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unread.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread.length > 9 ? '9+' : unread.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
            <p className="font-semibold text-sm">Notificações</p>
            <p className="text-xs text-muted-foreground">{unread.length} não lidas</p>
          </div>
          <div className="max-h-80 overflow-y-auto scroll-thin">
            {notifications.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Tudo em dia!</p>}
            {notifications.slice(0, 20).map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left p-3 border-b last:border-0 hover:bg-accent ${!n.read ? 'bg-primary/5' : ''}`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{formatDateTime(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </header>
  )
}
