'use client'

import { useState } from 'react'
import { useFetch } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Package, BarChart3, Award, Eye } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'

const PIE_COLORS = ['#c084fc', '#f0abfc', '#f9a8d4', '#fda4af', '#fbbf24', '#a78bfa', '#fb7185', '#facc15']

export default function RelatoriosModule() {
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(now.toISOString().slice(0, 10))
  const { data, loading } = useFetch<any>(`/api/reports/summary?from=${from}&to=${to}`)

  if (loading || !data) return <div className="p-8 text-center text-muted-foreground">Carregando relatórios…</div>

  const k = data.kpis
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Período: {formatDate(from)} — {formatDate(to)}</p>
        </div>
        <div className="flex gap-2">
          <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={DollarSign} label="Receita" value={formatCurrency(k.revenue)} color="text-emerald-600" />
        <Kpi icon={TrendingDown} label="Despesas" value={formatCurrency(k.expenses)} color="text-red-600" />
        <Kpi icon={TrendingUp} label="Lucro" value={formatCurrency(k.profit)} color={k.profit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <Kpi icon={DollarSign} label="Ticket médio" value={formatCurrency(k.ticketMedio)} />
        <Kpi icon={Users} label="Taxa de retorno" value={`${k.taxaRetorno.toFixed(1)}%`} />
        <Kpi icon={Calendar} label="Taxa cancelamento" value={`${k.taxaCancelamento.toFixed(1)}%`} />
        <Kpi icon={Calendar} label="Taxa de faltas" value={`${k.taxaFaltas.toFixed(1)}%`} />
        <Kpi icon={BarChart3} label="Ocupação agenda" value={`${k.ocupacao.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Procedimentos mais realizados */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Procedimentos mais realizados</CardTitle></CardHeader>
          <CardContent>
            {data.topServices.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período</p> :
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.topServices.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} stroke="oklch(0.6 0 0)" />
                  <Tooltip /><Bar dataKey="count" radius={[0, 6, 6, 0]} fill="oklch(0.55 0.18 350)" />
                </BarChart>
              </ResponsiveContainer>}
          </CardContent>
        </Card>

        {/* Faturamento por profissional */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Faturamento por profissional</CardTitle></CardHeader>
          <CardContent>
            {data.revenueByProf.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período</p> :
              <div className="space-y-2">
                {data.revenueByProf.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate">{p.name}</span>
                    <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                      <div className="h-full bg-primary flex items-center justify-end pr-2 text-xs text-primary-foreground" style={{ width: `${(p.total / data.revenueByProf[0].total) * 100}%` }}>{formatCurrency(p.total)}</div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{p.count}x</span>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Clientes */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Clientes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Total" value={String(data.clients.total)} />
            <Stat label="Novas no período" value={String(data.clients.newClients)} />
            <Stat label="Ativas" value={String(data.clients.active)} />
            <Stat label="Inativas" value={String(data.clients.inactive)} />
            <Stat label="Aniversariantes do mês" value={String(data.clients.birthdaysMonth)} />
          </div>
        </CardContent>
      </Card>

      {/* Faturamento por serviço (tabela) */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento por serviço</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.topServices.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">Sem dados</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr><th className="text-left p-2">Serviço</th><th className="text-right p-2">Qtd</th><th className="text-right p-2">Faturamento</th></tr></thead>
                <tbody>
                  {data.topServices.map((s: any, i: number) => (
                    <tr key={i} className="border-t"><td className="p-2">{s.name}</td><td className="text-right p-2">{s.count}</td><td className="text-right p-2 font-medium">{formatCurrency(s.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>}
        </CardContent>
      </Card>

      {/* Estoque baixo */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-orange-500" /> Estoque baixo</CardTitle></CardHeader>
        <CardContent>
          {data.lowStock.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhum produto com estoque baixo</p> :
            <div className="space-y-1.5">
              {data.lowStock.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant="destructive">{p.stock} {p.unit} (mín: {p.minStock})</Badge>
                </div>
              ))}
            </div>}
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, color }: any) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Icon className="w-3.5 h-3.5" /><span className="text-xs">{label}</span></div>
      <p className={`text-lg font-bold ${color ?? ''}`}>{value}</p>
    </CardContent></Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
}
