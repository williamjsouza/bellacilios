'use client'

import { useFetch } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, formatTime, initials } from '@/lib/format'
import {
  CalendarDays, DollarSign, Users, Cake, Eye, Package, TrendingUp,
  Clock, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight, MessageCircle, X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  confirmado: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  em_atendimento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  finalizado: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  nao_compareceu: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  reagendado: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', em_atendimento: 'Em atendimento',
  finalizado: 'Finalizado', cancelado: 'Cancelado', nao_compareceu: 'Não compareceu', reagendado: 'Reagendado',
}

export default function DashboardModule() {
  const { data, loading, error } = useFetch<any>('/api/dashboard')
  const { openClient, setModule } = useAppStore()

  if (loading) return <DashboardSkeleton />
  if (error) return <div className="p-6 text-destructive">Erro ao carregar dashboard: {error}</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <DashboardPendingAlerts />

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Faturamento hoje"
          value={formatCurrency(data.finance.revenueToday)}
          sub={`Mês: ${formatCurrency(data.finance.revenueMonth)}`}
          color="from-emerald-500 to-teal-500"
        />
        <KpiCard
          icon={CalendarDays}
          label="Atendimentos hoje"
          value={String(data.agenda.total)}
          sub={`${data.agenda.confirmed} confirmados · ${data.agenda.pending} pendentes`}
          color="from-purple-500 to-pink-500"
          onClick={() => setModule('agenda')}
        />
        <KpiCard
          icon={Users}
          label="Total de clientes"
          value={String(data.clients.total)}
          sub={`${data.clients.newWeek} novas na semana · ${data.clients.inactive} inativas`}
          color="from-rose-500 to-pink-500"
          onClick={() => setModule('clients')}
        />
        <KpiCard
          icon={Wallet}
          label="Saldo do caixa"
          value={formatCurrency(data.finance.cashBalance)}
          sub={data.finance.cashOpen ? 'Caixa aberto' : 'Caixa fechado'}
          color="from-amber-500 to-orange-500"
          onClick={() => setModule('financeiro')}
        />
      </div>

      {/* Alertas rápidos */}
      {(data.maintenanceDue.length > 0 || data.birthdays.today.length > 0 || data.lowStock.length > 0 || data.finance.payablesOverdue > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.maintenanceDue.length > 0 && <AlertPill icon={Eye} color="text-purple-600 bg-purple-50 dark:bg-purple-950/30" label="Manutenções pendentes" value={data.maintenanceDue.length} onClick={() => setModule('lash')} />}
          {data.birthdays.today.length > 0 && <AlertPill icon={Cake} color="text-pink-600 bg-pink-50 dark:bg-pink-950/30" label="Aniversariantes hoje" value={data.birthdays.today.length} onClick={() => setModule('clients')} />}
          {data.lowStock.length > 0 && <AlertPill icon={Package} color="text-orange-600 bg-orange-50 dark:bg-orange-950/30" label="Produtos em baixa" value={data.lowStock.length} onClick={() => setModule('estoque')} />}
          {data.finance.payablesOverdue > 0 && <AlertPill icon={AlertTriangle} color="text-red-600 bg-red-50 dark:bg-red-950/30" label="Contas vencidas" value={formatCurrency(data.finance.payablesOverdue)} onClick={() => setModule('financeiro')} />}
        </div>
      )}

      {/* Gráfico de faturamento + distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Faturamento — últimos 7 dias</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.revenueChart}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.18 350)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.55 0.18 350)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="oklch(0.6 0 0)" />
                <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.6 0 0)" tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.9 0 0)' }} />
                <Area type="monotone" dataKey="total" stroke="oklch(0.55 0.18 350)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top profissionais (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProfessionals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topProfessionals} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} stroke="oklch(0.6 0 0)" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8 }} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {data.topProfessionals.map((p: any, i: number) => (
                      <Cell key={i} fill={p.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agenda de hoje + lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> Agenda de hoje</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setModule('agenda')}>Ver tudo</Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.agenda.today.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum atendimento agendado para hoje</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto scroll-thin pr-1">
                {data.agenda.today.map((a: any) => (
                  <button
                    key={a.id}
                    onClick={() => openClient(a.client.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-12 text-center shrink-0">
                      <p className="text-sm font-semibold">{a.startTime}</p>
                      <p className="text-[10px] text-muted-foreground">{a.endTime}</p>
                    </div>
                    <div className="w-px h-10 bg-border" />
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(a.client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.service?.name} · {a.professional?.name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-purple-500" /> Manutenções pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {data.maintenanceDue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Tudo em dia</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto scroll-thin">
                  {data.maintenanceDue.slice(0, 5).map((m: any) => (
                    <button key={m.clientId} onClick={() => openClient(m.clientId)} className="w-full text-left p-2 rounded-md hover:bg-accent">
                      <p className="text-sm font-medium truncate">{m.clientName}</p>
                      <p className="text-xs text-muted-foreground">{m.daysSince} dias · {formatDate(m.recommended)}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Cake className="w-4 h-4 text-pink-500" /> Aniversariantes hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {data.birthdays.today.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum hoje</p>
              ) : (
                <div className="space-y-1.5">
                  {data.birthdays.today.slice(0, 5).map((b: any) => (
                    <button key={b.id} onClick={() => openClient(b.id)} className="w-full text-left p-2 rounded-md hover:bg-accent flex items-center gap-2">
                      <span className="text-lg">🎂</span>
                      <span className="text-sm font-medium truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financeiro resumo + top serviços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4 text-amber-500" /> Resumo financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FinRow icon={ArrowUpRight} color="text-emerald-600" label="A receber" value={formatCurrency(data.finance.receivablesOpen)} />
            <FinRow icon={ArrowDownRight} color="text-red-600" label="A pagar" value={formatCurrency(data.finance.payablesOpen)} />
            <FinRow icon={AlertTriangle} color="text-red-600" label="Vencido" value={formatCurrency(data.finance.payablesOverdue)} />
            <div className="h-px bg-border" />
            <FinRow icon={Wallet} color="text-primary" label="Saldo do caixa" value={formatCurrency(data.finance.cashBalance)} bold />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Procedimentos mais vendidos (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {data.topServices.map((s: any, i: number) => {
                  const max = data.topServices[0].count
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}º</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate">{s.name}</span>
                          <span className="font-semibold">{s.count}x</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(s.count / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color, onClick }: any) {
  return (
    <Card className={`overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertPill({ icon: Icon, color, label, value, onClick }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </button>
  )
}

function FinRow({ icon: Icon, color, label, value, bold }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-72 rounded-xl bg-muted animate-pulse lg:col-span-2" />
        <div className="h-72 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  )
}

function DashboardPendingAlerts() {
  const [data, setData] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const { openClient } = useAppStore()

  useEffect(() => {
    fetch('/api/alerts/pending').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data || dismissed) return null

  const total = data.maintenance.length + data.birthdays.length + data.lowStock.length + data.overdue.length + data.inactive.length
  if (total === 0) return null

  return (
    <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10 relative">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:bg-amber-200/50" onClick={() => setDismissed(true)}>
        <X className="w-4 h-4" />
      </Button>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
           <AlertTriangle className="w-5 h-5 text-amber-600" />
           <CardTitle className="text-base text-amber-800 dark:text-amber-500">Atenção — Pendências críticas ({total})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
         <div className="max-h-72 overflow-y-auto scroll-thin pr-2">
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.maintenance.length > 0 && (
                <div className="space-y-2">
                   <h4 className="text-sm font-semibold flex items-center gap-1.5 text-purple-600"><Eye className="w-4 h-4"/> Manutenções</h4>
                   {data.maintenance.map((m: any) => (
                     <AlertRow key={m.clientId} title={m.clientName} subtitle={`${m.daysSince} dias atrás`} onClick={() => openClient(m.clientId)} />
                   ))}
                </div>
              )}
              {data.birthdays.length > 0 && (
                <div className="space-y-2">
                   <h4 className="text-sm font-semibold flex items-center gap-1.5 text-pink-600"><Cake className="w-4 h-4"/> Aniversariantes</h4>
                   {data.birthdays.map((b: any) => (
                     <AlertRow key={b.id} title={b.name} subtitle={b.when === 'today' ? 'Hoje!' : `Em ${b.daysAhead} dias`} onClick={() => openClient(b.id)} />
                   ))}
                </div>
              )}
              {data.lowStock.length > 0 && (
                <div className="space-y-2">
                   <h4 className="text-sm font-semibold flex items-center gap-1.5 text-orange-600"><Package className="w-4 h-4"/> Estoque Baixo</h4>
                   {data.lowStock.map((p: any) => (
                     <AlertRow key={p.id} title={p.name} subtitle={`Atual: ${p.stock} | Mín: ${p.minStock}`} />
                   ))}
                </div>
              )}
              {data.overdue.length > 0 && (
                <div className="space-y-2">
                   <h4 className="text-sm font-semibold flex items-center gap-1.5 text-red-600"><Wallet className="w-4 h-4"/> Contas Vencidas</h4>
                   {data.overdue.map((c: any) => (
                     <AlertRow key={c.id} title={c.description} subtitle={`${formatCurrency(c.amount)} · ${c.daysOverdue} dias`} />
                   ))}
                </div>
              )}
              {data.inactive.length > 0 && (
                <div className="space-y-2">
                   <h4 className="text-sm font-semibold flex items-center gap-1.5 text-slate-600"><CalendarDays className="w-4 h-4"/> Inativas</h4>
                   {data.inactive.slice(0, 5).map((c: any) => (
                     <AlertRow key={c.id} title={c.name} subtitle={`Sem atendimento há ${c.daysSince} dias`} onClick={() => openClient(c.id)} />
                   ))}
                </div>
              )}
           </div>
         </div>
      </CardContent>
    </Card>
  )
}

function AlertRow({ title, subtitle, onClick }: any) {
  return (
    <div 
      className={`p-2 rounded-md bg-white dark:bg-black/20 border text-sm ${onClick ? 'cursor-pointer hover:bg-accent transition-colors' : ''}`}
      onClick={onClick}
    >
      <p className="font-medium break-words whitespace-normal">{title}</p>
      <p className="text-xs text-muted-foreground break-words whitespace-normal mt-0.5">{subtitle}</p>
    </div>
  )
}
