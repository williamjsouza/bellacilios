'use client'

import { useState, useEffect } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, initials } from '@/lib/format'
import { Eye, Plus, AlertTriangle, Calendar, MessageCircle, Sparkles, ClipboardList, Stethoscope, Clock, ChevronRight } from 'lucide-react'

const TECHNIQUES_DEFAULT = ['Fio a Fio', 'Volume Brasileiro', 'Volume Russo', 'Volume Híbrido', 'Volume Egípcio', 'Mega Volume', 'Fox Eyes', 'Cat Eyes', 'Doll Eyes', 'Wet Effect', 'Kim K', 'Efeito Personalizado']
const CURVATURES = ['J', 'B', 'C', 'CC', 'D', 'M']
const THICKNESS = ['0.03', '0.05', '0.07', '0.10', '0.15', '0.20']
const EFFECTS_DEFAULT = ['Natural', 'Clássico', 'Gatinho', 'Sereia', 'Aberto', 'Boneca']

export default function LashModule() {
  return (
    <Tabs defaultValue="maintenance">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="maintenance"><AlertTriangle className="w-4 h-4 mr-1" /> Manutenções</TabsTrigger>
        <TabsTrigger value="procedures"><ClipboardList className="w-4 h-4 mr-1" /> Procedimentos</TabsTrigger>
        <TabsTrigger value="techniques"><Sparkles className="w-4 h-4 mr-1" /> Técnicas</TabsTrigger>
      </TabsList>
      <TabsContent value="maintenance"><MaintenanceTab /></TabsContent>
      <TabsContent value="procedures"><ProceduresTab /></TabsContent>
      <TabsContent value="techniques"><TechniquesTab /></TabsContent>
    </Tabs>
  )
}

function MaintenanceTab() {
  const { data, loading, reload } = useFetch<any>('/api/alerts/pending')
  const { toast } = useToast()
  const { openClient, setModule } = useAppStore()
  const maintenance = data?.maintenance ?? []

  const ignore = async (m: any) => {
    // marca procedimento como tendo próxima manutenção adiada (atualiza nextMaintenance para +30 dias)
    try {
      const newDate = new Date(); newDate.setDate(newDate.getDate() + 30)
      await apiPost('/api/procedures', { id: findLatestProcId(m), nextMaintenance: newDate, nextMaintenanceDays: 30 }, 'POST')
      toast({ title: 'Manutenção adiada 30 dias' })
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  const findLatestProcId = (m: any) => m.procedureId ?? m.id // procedureId vem se adicionarmos; enquanto tanto usamos client
  const sendReminder = async (m: any) => {
    if (!m.whatsapp) { toast({ title: 'Cliente sem WhatsApp', variant: 'destructive' }); return }
    try {
      await apiPost('/api/whatsapp/send', { clientId: m.clientId, template: 'manutencao' })
      toast({ title: 'Lembrete de manutenção enviado' })
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-900">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center"><Eye className="w-5 h-5" /></div>
          <div>
            <p className="font-semibold">{maintenance.length} cliente(s) com manutenção de cílios pendente</p>
            <p className="text-sm text-muted-foreground">O intervalo recomendado é definido por serviço. Entre em contato para agendar o retorno.</p>
          </div>
        </CardContent>
      </Card>

      {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
        maintenance.length === 0 ? (
          <Card><CardContent className="p-12 text-center">
            <Calendar className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-medium">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground">Nenhuma manutenção vencida ou para hoje.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {maintenance.map((m: any) => (
              <Card key={m.clientId} className={m.status === 'Vencida' ? 'border-red-300 dark:border-red-900' : 'border-amber-300 dark:border-amber-900'}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="w-10 h-10 bg-primary/15"><AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">{initials(m.clientName)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{m.clientName}</p>
                      <Badge variant={m.status === 'Vencida' ? 'destructive' : 'secondary'}>{m.status}</Badge>
                      {m.service && <span className="text-xs text-muted-foreground">{m.service}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Último procedimento: {formatDate(m.lastDate)} · {m.daysSince} dias atrás · Recomendado: {formatDate(m.recommended)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => sendReminder(m)} title="Enviar WhatsApp"><MessageCircle className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { setModule('agenda') }} title="Agendar"><Calendar className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => openClient(m.clientId)} title="Ver ficha"><Eye className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => ignore(m)} title="Adiar 30 dias"><Clock className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

function ProceduresTab() {
  const { data, loading } = useFetch<any>('/api/procedures')
  const { openClient, openAtendimento } = useAppStore()
  const procs = (data?.procedures ?? []).filter((p:any) => p.technique)

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{procs.length} procedimento(s) de cílios registrado(s)</p>
      </div>
      {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
        procs.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum procedimento. Inicie um atendimento pela Agenda.</CardContent></Card> :
        <div className="space-y-2">
          {procs.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40"><AvatarFallback className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs">{initials(p.client?.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <button onClick={() => openClient(p.clientId)} className="font-medium hover:underline">{p.client?.name}</button>
                        <span className="text-sm text-muted-foreground"> · {p.technique}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(p.date)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                      {p.service && <Info label="Serviço" value={p.service.name} />}
                      <Info label="Curvatura" value={p.curvature} />
                      <Info label="Espessura" value={p.thickness} />
                      <Info label="Efeito" value={p.effect} />
                      <Info label="Cola" value={p.glue} />
                      <Info label="Lote" value={p.glueLot} />
                      <Info label="Duração" value={p.duration ? `${p.duration} min` : '—'} />
                      <Info label="Satisfação" value={p.satisfaction ? `${'★'.repeat(p.satisfaction)}${'☆'.repeat(5-p.satisfaction)}` : '—'} />
                    </div>
                    {p.nextMaintenance && (
                      <div className="mt-2 text-xs">
                        <Badge variant={new Date(p.nextMaintenance) < new Date() ? 'destructive' : 'secondary'}>
                          Próx. manutenção: {formatDate(p.nextMaintenance)}
                        </Badge>
                      </div>
                    )}
                    {p.lengths && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Mapping:</span>
                        <div className="flex gap-0.5 flex-wrap">
                          {p.lengths.split('|').map((l:string,i:number) => (
                            <span key={i} className="lash-eye-cell" style={{ width: 24, height: 24, fontSize: 10 }}>{l}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>}
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return <div><span className="text-muted-foreground">{label}:</span> <span className="font-medium">{value}</span></div>
}

function TechniquesTab() {
  const { data: settingsData, reload } = useFetch<any>('/api/settings')
  const { toast } = useToast()
  const [techniques, setTechniques] = useState<string[]>([])
  const [effects, setEffects] = useState<string[]>([])
  const [newTech, setNewTech] = useState('')
  const [newEff, setNewEff] = useState('')

  useEffect(() => {
    let t: string[] = []; let e: string[] = []
    try { t = JSON.parse(settingsData?.settings?.lash_techniques ?? '[]') } catch {}
    try { e = JSON.parse(settingsData?.settings?.lash_effects ?? '[]') } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTechniques(t)
     
    setEffects(e)
  }, [settingsData])

  const saveTech = async () => {
    if (!newTech.trim()) return
    const arr = [...techniques, newTech.trim()]
    setTechniques(arr); setNewTech('')
    await apiPost('/api/settings', { key: 'lash_techniques', value: JSON.stringify(arr) })
    toast({ title: 'Técnica adicionada' })
  }

  const saveEff = async () => {
    if (!newEff.trim()) return
    const arr = [...effects, newEff.trim()]
    setEffects(arr); setNewEff('')
    await apiPost('/api/settings', { key: 'lash_effects', value: JSON.stringify(arr) })
    toast({ title: 'Efeito adicionado' })
  }

  const removeTech = async (t: string) => {
    const arr = techniques.filter(x => x !== t)
    setTechniques(arr)
    await apiPost('/api/settings', { key: 'lash_techniques', value: JSON.stringify(arr) })
  }
  const removeEff = async (e: string) => {
    const arr = effects.filter(x => x !== e)
    setEffects(arr)
    await apiPost('/api/settings', { key: 'lash_effects', value: JSON.stringify(arr) })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Técnicas de Cílios</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {techniques.map((t) => (
              <Badge key={t} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                {t}
                <button onClick={() => removeTech(t)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            ))}
            {techniques.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma técnica cadastrada</p>}
          </div>
          <div className="flex gap-2">
            <Input value={newTech} onChange={(e) => setNewTech(e.target.value)} placeholder="Nova técnica…" onKeyDown={(e) => e.key === 'Enter' && saveTech()} />
            <Button onClick={saveTech}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Efeitos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {effects.map((e) => (
              <Badge key={e} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                {e}
                <button onClick={() => removeEff(e)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            ))}
            {effects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum efeito cadastrado</p>}
          </div>
          <div className="flex gap-2">
            <Input value={newEff} onChange={(e) => setNewEff(e.target.value)} placeholder="Novo efeito…" onKeyDown={(e) => e.key === 'Enter' && saveEff()} />
            <Button onClick={saveEff}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
