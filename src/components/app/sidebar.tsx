'use client'

import { useAppStore, ModuleKey } from '@/lib/store'
import { NAV_MODULES, GROUP_LABELS, NavModule } from './nav-config'
import { Sparkles, ChevronLeft, LogOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function Sidebar({ mobileOpen, onClose, user, onLogout }: { mobileOpen: boolean; onClose: () => void; user: any; onLogout: () => void }) {
  const role = user?.role ?? 'recepcionista'
  const { activeModule, setModule } = useAppStore()

  const groups: Record<string, NavModule[]> = { principal: [], operacao: [], gestao: [] }
  for (const m of NAV_MODULES) {
    if (m.roles.includes(role)) groups[m.group].push(m)
  }

  return (
    <>
      {/* overlay mobile */}
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed lg:sticky top-0 z-50 lg:z-30 h-screen w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center border border-sidebar-border shadow-sm overflow-hidden shrink-0">
              <img src="/img/logo.png" alt="Studio Jéssica Novais" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-semibold text-sm truncate">Studio Jéssica Novais</p>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">ERP Estética</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4 scroll-thin">
          <nav className="space-y-5">
            {(['principal', 'operacao', 'gestao'] as const).map((g) => {
              const mods = groups[g]
              if (!mods.length) return null
              return (
                <div key={g}>
                  <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{GROUP_LABELS[g]}</p>
                  <div className="space-y-0.5">
                    {mods.map((m) => {
                      const active = activeModule === m.key
                      return (
                        <button
                          key={m.key}
                          onClick={() => { setModule(m.key); onClose() }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            active
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <m.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{m.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <Avatar className="w-8 h-8 bg-sidebar-accent">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">{initials(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">{role}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => onLogout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
