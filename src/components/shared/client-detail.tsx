'use client'

import { useState, useRef } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, formatDateTime, initials, ageFromBirth, isBirthday } from '@/lib/format'
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Instagram, Cake, Eye, Calendar,
  Clock, DollarSign, FileText, MessageCircle, Camera, Trash2, Sparkles,
  History, Image as ImageIcon, Plus, Stethoscope, X, CheckCircle2,
} from 'lucide-react'
import { ClientForm } from './client-form'
import { LashMappingEditor } from './lash-mapping-editor'
import CheckoutModal from './checkout-modal'

const PHOTO_CATEGORIES = [
  { value: 'antes', label: 'Antes' },
  { value: 'durante', label: 'Durante' },
  { value: 'depois', label: 'Depois' },
  { value: 'evolucao', label: 'Evolução' },
  { value: 'resultado', label: 'Resultado' },
  { value: 'referencia', label: 'Referência' },
]

export default function ClientDetail({ clientId, onBack, onEdit }: { clientId: string; onBack: () => void; onEdit: (c: any) => void }) {
  const { data, loading, reload } = useFetch<any>(`/api/clients/${clientId}`)
  const timeline = useFetch<any>(`/api/clients/${clientId}/timeline`)
  const { toast } = useToast()
  const { setModule, openAtendimento } = useAppStore()
  const [formOpen, setFormOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [whatsappOpen, setWhatsappOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  if (loading || !data) return <div className="p-8 text-center text-muted-foreground">Carregando ficha…</div>
  const c = data.client

  const sendWhatsapp = async (template: string) => {
    try {
      await apiPost('/api/whatsapp/send', { clientId: c.id, template })
      toast({ title: 'Mensagem enfileirada para envio' })
      setWhatsappOpen(false)
      timeline.reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <Avatar className="w-14 h-14 bg-primary/15"><AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">{initials(c.name)}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{c.name}</h2>
            <Badge variant="secondary">{c.classification}</Badge>
            {isBirthday(c.birthDate) && <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">🎂 Aniversário hoje</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {[c.socialName && `@${c.socialName}`, ageFromBirth(c.birthDate) && `${ageFromBirth(c.birthDate)} anos`, c.profession, c.city && `${c.city}/${c.state}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const url = `${window.location.origin}/anamnese/${c.id}`
            navigator.clipboard.writeText(url)
            toast({ title: 'Link de anamnese copiado!' })
          }}><Stethoscope className="w-4 h-4 mr-1" /> Anamnese</Button>
          <Button variant="outline" size="sm" onClick={() => setWhatsappOpen(true)}><MessageCircle className="w-4 h-4 mr-1" /> WhatsApp</Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(c)}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCheckoutOpen(true)}>
            <DollarSign className="w-4 h-4 mr-1" /> Cobrar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat icon={Calendar} label="Visitas" value={String(c.totalVisits)} />
        <MiniStat icon={DollarSign} label="Total gasto" value={formatCurrency(c.totalSpent)} />
        <MiniStat icon={Clock} label="Última visita" value={c.lastVisit ? formatDate(c.lastVisit) : '—'} />
        <MiniStat icon={Sparkles} label="Primeira visita" value={c.firstVisit ? formatDate(c.firstVisit) : '—'} />
      </div>

      {/* Contato rápido */}
      <div className="flex flex-wrap gap-2 text-sm">
        {c.whatsapp && <ContactPill icon={MessageCircle} text={c.whatsapp} />}
        {c.phone && <ContactPill icon={Phone} text={c.phone} />}
        {c.email && <ContactPill icon={Mail} text={c.email} />}
        {c.instagram && <ContactPill icon={Instagram} text={c.instagram} />}
        {c.address && <ContactPill icon={MapPin} text={`${c.address} ${c.city ?? ''}`} />}
      </div>

      <Tabs defaultValue="history">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> Histórico</TabsTrigger>
          <TabsTrigger value="lash"><Eye className="w-4 h-4 mr-1" /> Cílios</TabsTrigger>
          <TabsTrigger value="photos"><Camera className="w-4 h-4 mr-1" /> Fotos</TabsTrigger>
          <TabsTrigger value="esthetic"><Sparkles className="w-4 h-4 mr-1" /> Estética</TabsTrigger>
          <TabsTrigger value="anamnesis"><Stethoscope className="w-4 h-4 mr-1" /> Anamnese</TabsTrigger>
          <TabsTrigger value="data"><FileText className="w-4 h-4 mr-1" /> Dados</TabsTrigger>
        </TabsList>

        {/* Histórico / Timeline */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              {timeline.loading ? <p className="text-sm text-muted-foreground">Carregando…</p> :
               !timeline.data?.events?.length ? <p className="text-sm text-muted-foreground py-8 text-center">Sem histórico</p> :
               <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-thin pr-2">
                 {timeline.data.events.map((ev: any, i: number) => <TimelineItem key={i} ev={ev} />)}
               </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cílios: mappings + procedimentos lash */}
        <TabsContent value="lash" className="space-y-3">
          <LashMappingEditor clientId={clientId} />
          <Card>
            <CardHeader><CardTitle className="text-base">Procedimentos de cílios</CardTitle></CardHeader>
            <CardContent>
              {c.procedures.filter((p:any) => p.technique).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum procedimento de cílios registrado</p> :
                <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                  {c.procedures.filter((p:any) => p.technique).map((p:any) => (
                    <div key={p.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{p.technique}</span>
                        <span className="text-muted-foreground">{formatDate(p.date)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                        {p.service && <span>Serviço: {p.service.name}</span>}
                        <span>Curvatura: {p.curvature ?? '—'}</span>
                        <span>Espessura: {p.thickness ?? '—'}</span>
                        <span>Efeito: {p.effect ?? '—'}</span>
                        {p.professional && <span>Profissional: {p.professional.name}</span>}
                        {p.nextMaintenance && <span className="text-amber-600">Próx. manutenção: {formatDate(p.nextMaintenance)}</span>}
                      </div>
                    </div>
                  ))}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fotos */}
        <TabsContent value="photos">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Registro fotográfico</CardTitle>
                <Button size="sm" onClick={() => setPhotoOpen(true)}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent>
              {c.photos.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma foto cadastrada</p> :
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {c.photos.map((p: any) => (
                    <div key={p.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img src={p.url} alt={p.category} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-[10px] text-white capitalize">{p.category}</p>
                        <p className="text-[10px] text-white/70">{formatDate(p.takenAt)}</p>
                      </div>
                      <button onClick={() => deletePhoto(clientId, p.id, reload, toast)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estética */}
        <TabsContent value="esthetic">
          <Card><CardContent className="p-4 space-y-3">
            <DataRow label="Tipo de pele" value={c.skinType} />
            <DataRow label="Sensibilidade" value={c.sensitivity} />
            <DataRow label="Alergias" value={c.allergies} />
            <DataRow label="Restrições" value={c.restrictions} />
            <DataRow label="Preferências" value={c.preferences} />
            <DataRow label="Contraindicações" value={c.contraindications} />
            <DataRow label="Observações profissionais" value={c.profObservations} full />
          </CardContent></Card>
        </TabsContent>

        {/* Anamnese */}
        <TabsContent value="anamnesis">
          <Card>
            <CardContent className="p-4 space-y-3">
              {c.anamnesis ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DataRow label="Fez extensão antes?" value={c.anamnesis.hadExtensionBefore ? `Sim (${c.anamnesis.timeWithoutExtension})` : 'Não'} />
                    <DataRow label="Reações anteriores?" value={c.anamnesis.previousReactions || 'Não'} />
                    <DataRow label="Usa maquiagem nos olhos?" value={c.anamnesis.wearingMakeup ? 'Sim' : 'Não'} />
                    <DataRow label="Tem alergias?" value={c.anamnesis.hasAllergies ? 'Sim' : 'Não'} />
                    <DataRow label="Problema de tireoide?" value={c.anamnesis.thyroidProblem ? 'Sim' : 'Não'} />
                    <DataRow label="Lado que dorme" value={c.anamnesis.sleepingSide || '—'} />
                    <DataRow label="Proced. recente nos olhos?" value={c.anamnesis.recentEyeProcedure ? 'Sim' : 'Não'} />
                    <DataRow label="Gestante / Amamentando?" value={c.anamnesis.pregnantOrNursing ? 'Sim' : 'Não'} />
                    <DataRow label="Tratamento oncológico?" value={c.anamnesis.oncologicalTreatment ? 'Sim' : 'Não'} />
                    <DataRow label="Doença de pele?" value={c.anamnesis.skinDisease ? 'Sim' : 'Não'} />
                    <DataRow label="Tratamento de saúde?" value={c.anamnesis.healthTreatment ? 'Sim' : 'Não'} />
                    <DataRow label="Usa medicamentos?" value={c.anamnesis.usingMedication ? 'Sim' : 'Não'} />
                    <DataRow label="Possui blefarite?" value={c.anamnesis.blepharitis ? 'Sim' : 'Não'} />
                    <DataRow label="Deseja cílios grandes?" value={c.anamnesis.wantsLongLashes ? 'Sim' : 'Não'} />
                    <DataRow label="Deseja cílios curvados?" value={c.anamnesis.wantsCurvedLashes ? 'Sim' : 'Não'} />
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <DataRow label="Resultado esperado" value={c.anamnesis.expectedResult || '—'} full />
                    <DataRow label="Preferência de estilo" value={c.anamnesis.eyeStylePreference || '—'} full />
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className={`w-5 h-5 ${c.anamnesis.termsAccepted ? 'text-green-500' : 'text-slate-300'}`} />
                      <span className="font-semibold text-sm">Termo de responsabilidade</span>
                    </div>
                    {c.anamnesis.termsAccepted ? (
                      <p className="text-xs text-muted-foreground">Assinado em: {formatDateTime(c.anamnesis.termsAcceptedAt)}</p>
                    ) : (
                      <p className="text-xs text-destructive">Ainda não assinado</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p>Nenhuma anamnese registrada para esta cliente.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                    const url = `${window.location.origin}/anamnese/${c.id}`
                    navigator.clipboard.writeText(url)
                    toast({ title: 'Link copiado!' })
                  }}>Copiar link do questionário</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados pessoais */}
        <TabsContent value="data">
          <Card><CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataRow label="CPF" value={c.cpf} />
            <DataRow label="RG" value={c.rg} />
            <DataRow label="Data de nascimento" value={c.birthDate ? formatDate(c.birthDate) : null} />
            <DataRow label="Sexo" value={c.gender} />
            <DataRow label="Origem" value={c.source} />
            <DataRow label="Profissional responsável" value={c.responsible} />
            <DataRow label="Observações" value={c.observations} full />
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Avaliação cílios (se houver) */}
      {(c.eyeShape || c.lashCurvature) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-purple-500" /> Avaliação inicial de cílios</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <DataRow label="Formato dos olhos" value={c.eyeShape} />
            <DataRow label="Tipo de fio" value={c.lashType} />
            <DataRow label="Espessura" value={c.lashThickness} />
            <DataRow label="Curvatura" value={c.lashCurvature} />
            <DataRow label="Densidade" value={c.lashDensity} />
            <DataRow label="Comprimento" value={c.lashLength} />
            <DataRow label="Sensibilidade" value={c.lashSensitivity} />
            <DataRow label="Alergias" value={c.lashAllergies} />
          </CardContent>
        </Card>
      )}

      <ClientForm open={formOpen} onOpenChange={setFormOpen} client={c} onSaved={() => { reload(); setFormOpen(false) }} />
      <PhotoUploadDialog open={photoOpen} onOpenChange={setPhotoOpen} clientId={clientId} onSaved={() => { reload(); setPhotoOpen(false) }} />
      <WhatsappDialog open={whatsappOpen} onOpenChange={setWhatsappOpen} onSend={sendWhatsapp} />
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        clientId={clientId}
        clientName={c.name}
        onPaid={() => { setCheckoutOpen(false); reload() }}
      />
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: any) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1"><Icon className="w-3.5 h-3.5" /><span className="text-xs">{label}</span></div>
      <p className="font-semibold">{value}</p>
    </CardContent></Card>
  )
}

function ContactPill({ icon: Icon, text }: any) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs">
      <Icon className="w-3 h-3 text-muted-foreground" />{text}
    </div>
  )
}

function DataRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  )
}

function TimelineItem({ ev }: { ev: any }) {
  const config: Record<string, any> = {
    appointment: { icon: Calendar, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300', label: 'Agendamento' },
    procedure: { icon: Eye, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300', label: 'Procedimento' },
    sale: { icon: DollarSign, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Venda' },
    quote: { icon: FileText, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300', label: 'Orçamento' },
    whatsapp: { icon: MessageCircle, color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300', label: 'WhatsApp' },
    receivable: { icon: DollarSign, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300', label: 'Financeiro' },
    photo: { icon: Camera, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300', label: 'Foto' },
  }
  const cfg = config[ev.type] ?? { icon: FileText, color: 'bg-muted', label: ev.type }
  const d = ev.data
  let title = cfg.label
  let desc = ''
  if (ev.type === 'appointment') { title = `${d.service?.name ?? 'Agendamento'} — ${d.startTime}`; desc = `${d.professional?.name ?? ''} · ${d.status}` }
  if (ev.type === 'procedure') { title = d.technique ?? d.service?.name ?? 'Procedimento'; desc = `${d.professional?.name ?? ''}${d.nextMaintenance ? ` · Próx. manutenção ${formatDate(d.nextMaintenance)}` : ''}` }
  if (ev.type === 'sale') { title = `Venda ${formatCurrency(d.total)}`; desc = `${d.items?.length ?? 0} item(s) · ${d.status}` }
  if (ev.type === 'quote') { title = `Orçamento ${formatCurrency(d.total)} — ${d.status}`; desc = d.observations }
  if (ev.type === 'whatsapp') { title = `WhatsApp: ${d.template ?? d.type}`; desc = d.content }
  if (ev.type === 'receivable') { title = `Conta a receber ${formatCurrency(d.amount)}`; desc = `${d.description} · ${d.status}` }
  if (ev.type === 'photo') { title = `Foto: ${d.category}`; desc = d.observation }

  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-full ${cfg.color} flex items-center justify-center shrink-0`}><cfg.icon className="w-4 h-4" /></div>
      <div className="flex-1 pb-3 border-b border-border/50">
        <div className="flex justify-between gap-2">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground shrink-0">{formatDateTime(ev.date)}</p>
        </div>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

async function deletePhoto(clientId: string, photoId: string, reload: () => void, toast: any) {
  if (!confirm('Excluir esta foto?')) return
  try {
    await fetch(`/api/clients/${clientId}/photos?photoId=${photoId}`, { method: 'DELETE' })
    toast({ title: 'Foto excluída' })
    reload()
  } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
}

function PhotoUploadDialog({ open, onOpenChange, clientId, onSaved }: any) {
  const { toast } = useToast()
  const [category, setCategory] = useState('antes')
  const [observation, setObservation] = useState('')
  const [preview, setPreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 3_000_000) { toast({ title: 'Imagem muito grande (máx 3MB)', variant: 'destructive' }); return }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const save = async () => {
    if (!preview) { toast({ title: 'Selecione uma imagem', variant: 'destructive' }); return }
    try {
      await apiPost(`/api/clients/${clientId}/photos`, { category, url: preview, observation })
      toast({ title: 'Foto adicionada' })
      setPreview(''); setObservation(''); setCategory('antes')
      onSaved()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPreview(''); setObservation('') } onOpenChange(o) }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar foto</DialogTitle><DialogDescription>Categoria e observação ajudam a organizar a evolução</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PHOTO_CATEGORIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Imagem (máx 3MB)</Label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full"><Camera className="w-4 h-4 mr-1" /> Selecionar imagem</Button>
            {preview && <img src={preview} alt="preview" className="w-full max-h-64 object-contain rounded-lg border" />}
          </div>
          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save} disabled={!preview}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WhatsappDialog({ open, onOpenChange, onSend }: any) {
  const templates = [
    { key: 'agendamento', label: 'Confirmação de agendamento' },
    { key: 'lembrete', label: 'Lembrete de atendimento' },
    { key: 'aniversario', label: 'Aniversário' },
    { key: 'pos_atendimento', label: 'Pós-atendimento' },
    { key: 'manutencao', label: 'Manutenção de cílios' },
    { key: 'cliente_inativa', label: 'Cliente inativa' },
    { key: 'satisfacao', label: 'Pesquisa de satisfação' },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar mensagem WhatsApp</DialogTitle><DialogDescription>Escolha um template. A mensagem será personalizada com os dados da cliente.</DialogDescription></DialogHeader>
        <div className="space-y-1.5">
          {templates.map(t => (
            <Button key={t.key} variant="outline" className="w-full justify-start" onClick={() => onSend(t.key)}>
              <MessageCircle className="w-4 h-4 mr-2" /> {t.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
