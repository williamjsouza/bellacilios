'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, initials, WEEKDAYS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, User, Eye, Check, X, Stethoscope, MessageCircle, ChevronsUpDown, Trash2 } from 'lucide-react'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8h às 20h
const STATUS_LABEL: Record<string, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', em_atendimento: 'Em atendimento',
  finalizado: 'Finalizado', cancelado: 'Cancelado', nao_compareceu: 'Não compareceu', reagendado: 'Reagendado',
}
const STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-blue-500', confirmado: 'bg-emerald-500', em_atendimento: 'bg-amber-500',
  finalizado: 'bg-slate-400', cancelado: 'bg-red-500 line-through', nao_compareceu: 'bg-red-700', reagendado: 'bg-purple-500',
}

const getDateKey = (d: Date | string) => {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AgendaModule() {
  const { data: profsData } = useFetch<any>('/api/professionals?active=1')
  const { toast } = useToast()
  const { openClient, openAtendimento, setModule } = useAppStore()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProf, setSelectedProf] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formInit, setFormInit] = useState<any>(null)

  const dateStr = getDateKey(currentDate)

  const weekStart = useMemo(() => {
    const d = new Date(currentDate)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentDate])

  const weekStartStr = getDateKey(weekStart)

  const from = view === 'day' ? dateStr : weekStartStr
  
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = getDateKey(weekEnd)
  
  const to = view === 'day' ? dateStr : weekEndStr

  const { data, loading, reload } = useFetch<any>(`/api/appointments?from=${from}&to=${to}${selectedProf !== 'all' ? `&professionalId=${selectedProf}` : ''}`)

  const professionals = profsData?.professionals ?? []

  const apptsByDateProf = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const a of data?.appointments ?? []) {
      const key = getDateKey(a.date)
      if (!map[key]) map[key] = []
      map[key].push(a)
    }
    return map
  }, [data])

  const changeDay = (delta: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d)
  }

  const changeWeek = (delta: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta * 7)
    setCurrentDate(d)
  }

  const newAppt = (date?: Date, profId?: string, hour?: number) => {
    setEditing(null)
    const init: any = {}
    if (date) init.date = getDateKey(date)
    if (profId) init.professionalId = profId
    if (hour) { init.startTime = `${String(hour).padStart(2, '0')}:00` }
    setFormInit(init)
    setFormOpen(true)
  }

  const editAppt = (a: any) => {
    setEditing(a)
    setFormInit(null)
    setFormOpen(true)
  }

  const changeStatus = async (a: any, status: string) => {
    try {
      await apiPost(`/api/appointments/${a.id}`, { status }, 'PUT')
      toast({ title: 'Status atualizado' })
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  const sendReminder = async (a: any) => {
    try {
      await apiPost('/api/whatsapp/send', { clientId: a.clientId, template: 'agendamento' })
      toast({ title: 'Lembrete enviado' })
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => view === 'day' ? changeDay(-1) : changeWeek(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => view === 'day' ? changeDay(1) : changeWeek(1)}><ChevronRight className="w-4 h-4" /></Button>
          <span className="font-semibold ml-2">
            {view === 'day'
              ? formatDate(currentDate)
              : `${formatDate(weekStart)} — ${formatDate(new Date(weekEnd.getTime() - 86400000))}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button size="sm" variant={view === 'day' ? 'default' : 'ghost'} onClick={() => setView('day')}>Dia</Button>
            <Button size="sm" variant={view === 'week' ? 'default' : 'ghost'} onClick={() => setView('week')}>Semana</Button>
          </div>
          <Select value={selectedProf} onValueChange={setSelectedProf}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Profissional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos profissionais</SelectItem>
              {professionals.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => newAppt()}><Plus className="w-4 h-4 mr-1" /> Agendar</Button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[k]?.split(' ')[0]}`} />{v}</span>
        ))}
      </div>

      {/* Visualização */}
      {view === 'day' ? (
        <DayView
          date={currentDate}
          professionals={professionals}
          appts={apptsByDateProf[dateStr] ?? []}
          loading={loading}
          onNew={newAppt}
          onEdit={editAppt}
          onChangeStatus={changeStatus}
          onOpenClient={openClient}
          onAtendimento={openAtendimento}
          onReminder={sendReminder}
        />
      ) : (
        <WeekView
          weekStart={weekStart}
          professionals={professionals}
          apptsByDateProf={apptsByDateProf}
          loading={loading}
          onEdit={editAppt}
          onOpenClient={openClient}
        />
      )}

      <AppointmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        init={formInit}
        onSaved={() => { reload(); setFormOpen(false) }}
      />
    </div>
  )
}

function DayView({ date, professionals, appts, loading, onNew, onEdit, onChangeStatus, onOpenClient, onAtendimento, onReminder }: any) {
  const [activeProf, setActiveProf] = useState<string>(professionals[0]?.id ?? '')
  const prof = professionals.find((p: any) => p.id === activeProf) ?? professionals[0]
  if (!prof) return <Card><CardContent className="p-8 text-center text-muted-foreground">Cadastre um profissional para usar a agenda.</CardContent></Card>

  return (
    <div className="space-y-2">
      {/* Seletor de profissional horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {professionals.map((p: any) => (
          <button
            key={p.id}
            onClick={() => setActiveProf(p.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${activeProf === p.id || (!activeProf && p.id === professionals[0].id) ? 'text-white' : 'bg-card hover:bg-accent'}`}
            style={activeProf === p.id || (!activeProf && p.id === professionals[0].id) ? { backgroundColor: p.color } : {}}
          >
            {p.name}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
            <div className="max-h-[70vh] overflow-y-auto scroll-thin">
              {HOURS.map((h) => {
                const hourAppts = appts.filter((a: any) => {
                  if (a.professionalId !== prof.id) return false
                  const ah = parseInt(a.startTime.split(':')[0])
                  return ah === h
                })
                return (
                  <div key={h} className="flex border-b last:border-0 min-h-[60px]">
                    <div className="w-16 shrink-0 p-2 text-xs text-muted-foreground text-right border-r">
                      {String(h).padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 p-1.5">
                      {hourAppts.length === 0 ? (
                        <button onClick={() => onNew(date, prof.id, h)} className="w-full h-full min-h-[44px] rounded-md text-xs text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center">
                          + livre
                        </button>
                      ) : (
                        hourAppts.map((a: any) => <ApptCard key={a.id} a={a} prof={prof} onEdit={() => onEdit(a)} onChangeStatus={onChangeStatus} onOpenClient={onOpenClient} onAtendimento={onAtendimento} onReminder={onReminder} />)
                      )}
                    </div>
                  </div>
                )
              })}
            </div>}
        </CardContent>
      </Card>
    </div>
  )
}

function WeekView({ weekStart, professionals, apptsByDateProf, loading, onEdit, onOpenClient }: any) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d
  })
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
          <div className="grid grid-cols-7 min-w-[800px]">
            {days.map((d) => {
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              const key = `${y}-${m}-${day}`
              const dayAppts = apptsByDateProf[key] ?? []
              
              const now = new Date()
              const isToday = key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
              
              return (
                <div key={key} className="border-r last:border-0 min-h-[400px]">
                  <div className={`p-2 text-center border-b sticky top-0 bg-card z-10 ${isToday ? 'bg-primary/10' : ''}`}>
                    <p className="text-xs text-muted-foreground">{WEEKDAYS[d.getDay()]}</p>
                    <p className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</p>
                  </div>
                  <div className="p-1 space-y-1">
                    {dayAppts.length === 0 && <p className="text-[10px] text-muted-foreground/40 text-center py-4">—</p>}
                    {dayAppts.sort((a:any,b:any) => a.startTime.localeCompare(b.startTime)).map((a: any) => {
                      const prof = professionals.find((p:any) => p.id === a.professionalId)
                      return (
                        <button key={a.id} onClick={() => onEdit(a)} className="w-full text-left p-1.5 rounded-md text-xs hover:shadow-sm transition-shadow" style={{ backgroundColor: `${prof?.color ?? '#888'}20`, borderLeft: `3px solid ${prof?.color ?? '#888'}` }}>
                          <p className="font-semibold">{a.startTime}</p>
                          <p className="truncate">{a.client?.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{a.service?.name}</p>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mt-0.5 ${STATUS_COLORS[a.status]?.split(' ')[0]}`} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>}
      </CardContent>
    </Card>
  )
}

function ApptCard({ a, prof, onEdit, onChangeStatus, onOpenClient, onAtendimento, onReminder }: any) {
  const [menu, setMenu] = useState(false)
  return (
    <div className="rounded-md p-2 mb-1 cursor-pointer text-white shadow-sm" style={{ backgroundColor: prof.color }} onClick={onEdit}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{a.startTime} — {a.endTime}</p>
          <p className="text-sm font-medium truncate">{a.client?.name}</p>
          <p className="text-[10px] opacity-90 truncate">{a.service?.name}</p>
        </div>
        <Badge variant="secondary" className="text-[9px] h-4 px-1">{STATUS_LABEL[a.status]}</Badge>
      </div>
      <div className="flex gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
        {a.status === 'agendado' && <button onClick={() => onChangeStatus(a, 'confirmado')} className="text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> Confirmar</button>}
        {a.status === 'confirmado' && <button onClick={() => onAtendimento(a.id)} className="text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Stethoscope className="w-2.5 h-2.5" /> Atender</button>}
        <button onClick={() => onOpenClient(a.clientId)} className="text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /></button>
        {a.client?.whatsapp && <button onClick={onReminder} className="text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" /></button>}
        {(a.status === 'agendado' || a.status === 'confirmado') && <button onClick={() => onChangeStatus(a, 'cancelado')} className="text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded flex items-center gap-0.5"><X className="w-2.5 h-2.5" /></button>}
      </div>
    </div>
  )
}

function AppointmentForm({ open, onOpenChange, editing, init, onSaved }: any) {
  const { toast } = useToast()
  const { data: clientsData } = useFetch<any>('/api/clients')
  const { data: profsData } = useFetch<any>('/api/professionals?active=1')
  const { data: servicesData } = useFetch<any>('/api/services?active=1')
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)

  useEffect(() => {
     
    if (editing) {
      setForm({
        ...editing,
        serviceIds: [editing.serviceId],
        date: new Date(editing.date).toISOString().slice(0, 10),
      })
    } else if (init) {
      const allServices = servicesData?.flatMap ? servicesData.flatMap((c:any) => c.services) : []
      const defaultService = allServices?.[0]
      const defaultProf = profsData?.professionals?.find((p:any) => init.professionalId ? p.id === init.professionalId : true) ?? profsData?.professionals?.[0]
      const startMin = init.startTime ? parseInt(init.startTime.split(':')[0]) * 60 : 540
      const dur = defaultService?.duration ?? 60
      const endMin = startMin + dur
      setForm({
        clientId: '', professionalId: init.professionalId ?? defaultProf?.id ?? '',
        serviceIds: defaultService ? [defaultService.id] : [], date: init.date ?? getDateKey(new Date()),
        startTime: init.startTime ?? '09:00',
        endTime: `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`,
        duration: dur, price: defaultService?.price ?? 0, status: 'agendado', observation: '',
      })
    }
     
  }, [editing, init, servicesData, profsData])

  const set = (k: string, v: any) => setForm((f:any) => ({ ...f, [k]: v }))

  const onServiceToggle = (sid: string) => {
    const allServices = servicesData?.flatMap ? servicesData.flatMap((c:any) => c.services) : []
    
    setForm((f:any) => {
      const ids = (f.serviceIds || []).includes(sid) ? f.serviceIds.filter((id:any) => id !== sid) : [...(f.serviceIds || []), sid]
      if (ids.length === 0) return f
      const svcs = ids.map((id:any) => allServices.find((s:any) => s.id === id)).filter(Boolean)
      const dur = svcs.reduce((acc:number, s:any) => acc + s.duration, 0)
      const price = svcs.reduce((acc:number, s:any) => acc + s.price, 0)
      const startMin = f.startTime ? parseInt(f.startTime.split(':')[0]) * 60 + parseInt(f.startTime.split(':')[1] || '0') : 540
      const endMin = startMin + dur
      return { ...f, serviceIds: ids, duration: dur, price, endTime: `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}` }
    })
  }

  const onTimeChange = (start: string) => {
    const [h, m] = start.split(':').map(Number)
    const endMin = h * 60 + m + (form.duration ?? 60)
    setForm((f:any) => ({ ...f, startTime: start, endTime: `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}` }))
  }

  const save = async () => {
    if (!form.clientId) { toast({ title: 'Selecione a cliente', variant: 'destructive' }); return }
    if (!form.professionalId) { toast({ title: 'Selecione o profissional', variant: 'destructive' }); return }
    if (!form.serviceIds || form.serviceIds.length === 0) { toast({ title: 'Selecione o serviço', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const { clientId, professionalId, serviceIds, date, startTime, endTime, duration, price, status, observation } = form
      const payload: any = { clientId, professionalId, serviceIds, date, startTime, endTime, duration, price, status, observation }
      if (editing?.id) { payload.id = editing.id }
      await apiPost('/api/appointments', payload)
      toast({ title: editing ? 'Agendamento atualizado' : 'Agendamento criado' })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const deleteAppt = async () => {
    if (!editing?.id) return
    if (!confirm('Tem certeza que deseja EXCLUIR permanentemente este agendamento da agenda?')) return
    setSaving(true)
    try {
      await apiPost(`/api/appointments/${editing.id}`, {}, 'DELETE')
      toast({ title: 'Agendamento excluído' })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle><DialogDescription>Preencha os dados do atendimento</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={form.clientId} onValueChange={(v) => set('clientId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione a cliente" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {(clientsData?.clients ?? []).map((c:any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Serviço(s) *</Label>
              <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={serviceOpen} className="w-full justify-between font-normal h-auto min-h-10 py-2">
                    <div className="flex flex-wrap gap-1">
                      {form.serviceIds?.length > 0 ? (
                        (servicesData?.flatMap ? servicesData.flatMap((c:any) => c.services) : [])
                          .filter((s:any) => form.serviceIds.includes(s.id))
                          .map((s:any) => <Badge key={s.id} variant="secondary" className="font-normal text-[10px] py-0">{s.name}</Badge>)
                      ) : "Selecione o(s) serviço(s)"}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar serviço..." />
                    <CommandList>
                      <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                      <CommandGroup>
                        {(servicesData?.flatMap ? servicesData.flatMap((c:any) => c.services) : []).map((s:any) => (
                          <CommandItem key={s.id} value={s.name} onSelect={() => { onServiceToggle(s.id); if (editing) setServiceOpen(false) }}>
                            <Check className={cn("mr-2 h-4 w-4", form.serviceIds?.includes(s.id) ? "opacity-100" : "opacity-0")} />
                            {s.name} — {formatCurrency(s.price)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional *</Label>
              <Select value={form.professionalId} onValueChange={(v) => set('professionalId', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(profsData?.professionals ?? []).map((p:any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Início</Label><Input type="time" value={form.startTime} onChange={(e) => onTimeChange(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fim</Label><Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Duração (min)</Label><Input type="number" value={form.duration} onChange={(e) => set('duration', parseInt(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Valor</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', parseFloat(e.target.value))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} value={form.observation || ''} onChange={(e) => set('observation', e.target.value)} /></div>
        </div>
        <DialogFooter className="sm:justify-between items-center w-full mt-2">
          {editing ? (
             <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2" onClick={deleteAppt} disabled={saving}>
               <Trash2 className="w-4 h-4 mr-1" /> Excluir
             </Button>
          ) : <div/>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
