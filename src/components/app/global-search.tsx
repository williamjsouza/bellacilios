'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Users, Calendar, FileText, Eye, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

interface Result {
  type: 'client' | 'appointment' | 'quote' | 'procedure'
  id: string
  title: string
  subtitle: string
  meta?: string
}

export default function GlobalSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { openClient } = useAppStore()

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        const j = await res.json()
        setResults(j.results || [])
        setOpen(true)
      } catch { /* */ } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (r: Result) => {
    if (r.type === 'client') openClient(r.id)
    setQ(''); setOpen(false); setResults([])
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Buscar cliente, CPF, telefone, agendamento…"
          className="pl-9 pr-8 bg-muted/50 border-0 focus-visible:ring-1"
        />
        {q && (
          <button onClick={() => { setQ(''); setResults([]) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute top-full mt-1.5 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto scroll-thin">
          {loading && <div className="p-3 text-sm text-muted-foreground">Buscando…</div>}
          {!loading && results.length === 0 && <div className="p-3 text-sm text-muted-foreground">Nenhum resultado para "{q}"</div>}
          {results.map((r) => {
            const Icon = r.type === 'client' ? Users : r.type === 'appointment' ? Calendar : r.type === 'quote' ? FileText : Eye
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => pick(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left border-b border-border/50 last:border-0"
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                </div>
                {r.meta && <span className="text-xs text-muted-foreground">{r.meta}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
