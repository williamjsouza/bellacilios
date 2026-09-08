'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, Eye, Calendar, Cake, Package, Wallet } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatDate, formatCurrency } from '@/lib/format'

interface Pending {
  maintenance: any[]
  birthdays: any[]
  lowStock: any[]
  overdue: any[]
  inactive: any[]
}

export default function PendingAlertsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { openClient } = useAppStore()
  const [data, setData] = useState<Pending | null>(null)

  useEffect(() => {
    if (open) {
      fetch('/api/alerts/pending').then(r => r.json()).then(setData).catch(() => {})
    }
  }, [open])

  const total = data ? data.maintenance.length + data.birthdays.length + data.lowStock.length + data.overdue.length + data.inactive.length : 0

  const goToClient = (id: string) => {
    openClient(id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Atenção — Pendências do dia</DialogTitle>
              <DialogDescription>{total} item(ns) precisam da sua atenção</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3 scroll-thin">
          {!data && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {data && total === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <p className="text-lg font-medium text-foreground">Tudo em dia!</p>
              <p className="text-sm">Não há pendências críticas no momento.</p>
            </div>
          )}

          {data && data.maintenance.length > 0 && (
            <Section icon={Eye} title="Manutenções de cílios pendentes" color="text-purple-600">
              {data.maintenance.map((m: any) => (
                <Row key={m.clientId} title={m.clientName} subtitle={`Último procedimento: ${formatDate(m.lastDate)} · ${m.daysSince} dias atrás · Recomendado: ${formatDate(m.recommended)}`} badge={m.status} action={() => goToClient(m.clientId)} actionLabel="Ver ficha" />
              ))}
            </Section>
          )}

          {data && data.birthdays.length > 0 && (
            <Section icon={Cake} title="Aniversariantes" color="text-pink-600">
              {data.birthdays.map((b: any) => (
                <Row key={b.id} title={b.name} subtitle={b.when === 'today' ? 'Aniversário hoje!' : `Aniversário em ${b.daysAhead} dia(s)`} badge={b.when === 'today' ? 'HOJE' : `${b.daysAhead}d`} action={() => goToClient(b.id)} actionLabel="Ver ficha" />
              ))}
            </Section>
          )}

          {data && data.lowStock.length > 0 && (
            <Section icon={Package} title="Estoque baixo" color="text-orange-600">
              {data.lowStock.map((p: any) => (
                <Row key={p.id} title={p.name} subtitle={`Estoque: ${p.stock} ${p.unit} · Mínimo: ${p.minStock}`} badge={`${p.stock} ${p.unit}`} />
              ))}
            </Section>
          )}

          {data && data.overdue.length > 0 && (
            <Section icon={Wallet} title="Contas vencidas" color="text-red-600">
              {data.overdue.map((c: any) => (
                <Row key={c.id} title={c.description} subtitle={`Vencimento: ${formatDate(c.dueDate)} · ${c.daysOverdue} dias em atraso`} badge={formatCurrency(c.amount)} />
              ))}
            </Section>
          )}

          {data && data.inactive.length > 0 && (
            <Section icon={Calendar} title="Clientes inativas" color="text-slate-600">
              {data.inactive.slice(0, 5).map((c: any) => (
                <Row key={c.id} title={c.name} subtitle={`Sem atendimento há ${c.daysSince} dias`} action={() => goToClient(c.id)} actionLabel="Ver ficha" />
              ))}
            </Section>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>Entendi, fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ icon: Icon, title, color, children }: any) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ title, subtitle, badge, action, actionLabel }: any) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/60">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words whitespace-normal">{title}</p>
        <p className="text-xs text-muted-foreground break-words whitespace-normal mt-0.5">{subtitle}</p>
      </div>
      {badge && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap shrink-0">{badge}</span>}
      {action && (
        <Button size="sm" variant="outline" onClick={action} className="h-7 text-xs shrink-0">{actionLabel}</Button>
      )}
    </div>
  )
}
