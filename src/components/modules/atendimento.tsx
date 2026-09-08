'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, initials } from '@/lib/format'
import { Stethoscope, Eye, Package, Camera, Check, DollarSign, Sparkles, ArrowRight, ArrowLeft, Plus, Trash2, Image as ImageIcon, X } from 'lucide-react'
import CheckoutModal from '@/components/shared/checkout-modal'

const STEPS = ['ficha', 'procedimento', 'consumo', 'fotos', 'pagamento', 'finalizar']

export default function AtendimentoModule() {
  const { appointmentId, setModule } = useAppStore()
  const [activeApptId, setActiveApptId] = useState<string | null>(appointmentId)
  const { toast } = useToast()

  const { data: todayData, loading, reload } = useFetch<any>('/api/appointments?from=' + new Date().toISOString().slice(0,10) + '&to=' + new Date().toISOString().slice(0,10))

  if (activeApptId) {
    return <AtendimentoFlow appointmentId={activeApptId} onExit={() => { setActiveApptId(null); setModule('agenda') }} />
  }

  const todayAppts = (todayData?.appointments ?? []).filter((a:any) => a.status === 'confirmado' || a.status === 'em_atendimento')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Atendimentos do dia</h2>
        <p className="text-sm text-muted-foreground">Selecione um atendimento confirmado para iniciar o fluxo de atendimento</p>
      </div>
      {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
        todayAppts.length === 0 ? (
          <Card><CardContent className="p-12 text-center">
            <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">Nenhum atendimento confirmado para hoje</p>
            <p className="text-sm text-muted-foreground">Confirme agendamentos na Agenda para liberá-los para atendimento.</p>
            <Button className="mt-4" onClick={() => setModule('agenda')}>Ir para Agenda</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {todayAppts.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-16 text-center shrink-0">
                    <p className="font-semibold">{a.startTime}</p>
                    <p className="text-[10px] text-muted-foreground">{a.endTime}</p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">{initials(a.client?.name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.client?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.service?.name} · {a.professional?.name} · {formatCurrency(a.price)}</p>
                  </div>
                  <Button onClick={() => setActiveApptId(a.id)}>
                    {a.status === 'em_atendimento' ? 'Continuar' : 'Iniciar'} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

function AtendimentoFlow({ appointmentId, onExit }: { appointmentId: string; onExit: () => void }) {
  const { data: apptData, loading } = useFetch<any>(`/api/appointments?from=2000-01-01&to=2100-01-01`)
  const appt = useMemo(() => apptData?.appointments?.find((a:any) => a.id === appointmentId) ?? null, [apptData, appointmentId])
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<any>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutSaleId, setCheckoutSaleId] = useState<string | undefined>(undefined)
  const { toast } = useToast()
  const { openClient } = useAppStore()

  useEffect(() => {
    if (appt && !form.clientId) {
      const svc = appt.service
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        clientId: appt.clientId, professionalId: appt.professionalId, serviceId: appt.serviceId,
        appointmentId: appt.id, date: new Date().toISOString(),
        technique: '', mapping: '', curvature: svc?.name?.includes('Volume') ? 'CC' : 'C',
        thickness: '0.07', lengths: '', effect: '',
        glue: '', glueLot: '', duration: svc?.duration ?? 60,
        observation: '', reactions: '', recommendations: '',
        nextMaintenanceDays: svc?.maintenanceDays ?? 21,
        consumptions: [] as any[], photos: [] as any[],
        paymentMethod: 'pix', satisfaction: 5,
      })
    }
  }, [appt])

  // marcar como em_atendimento ao iniciar
  useEffect(() => {
    if (appt && appt.status === 'confirmado') {
      apiPost(`/api/appointments/${appt.id}`, { status: 'em_atendimento' }, 'PUT').catch(() => {})
    }
  }, [appt])

  if (loading || !appt) return <div className="p-8 text-center text-muted-foreground">Carregando atendimento…</div>

  const set = (k: string, v: any) => setForm((f:any) => ({ ...f, [k]: v }))

  const finalize = async () => {
    try {
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + (form.nextMaintenanceDays ?? 21))
      const payload = { ...form, nextMaintenance: nextDate, nextMaintenanceDays: form.nextMaintenanceDays, status: 'finalizado' }
      // A API retorna { procedure, saleId } - capturamos o saleId da fatura criada com o serviço do agendamento
      const r = await apiPost('/api/procedures', payload)
      await apiPost(`/api/appointments/${appt.id}`, { status: 'finalizado' }, 'PUT')
      toast({ title: 'Procedimento registrado!', description: 'Agora processe o pagamento no checkout.' })
      // Guardar o saleId para abrir o checkout direto na fatura certa
      if (r.saleId) setCheckoutSaleId(r.saleId)
      setCheckoutOpen(true)
    } catch (e: any) {
      toast({ title: 'Erro ao finalizar', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{appt.client?.name}</h2>
          <p className="text-sm text-muted-foreground">{appt.service?.name} · {appt.professional?.name} · {formatCurrency(appt.price)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => openClient(appt.clientId)}><Eye className="w-4 h-4 mr-1" /> Ficha completa</Button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center shrink-0">
            <button onClick={() => setStep(i)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {i+1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
            {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-4">
          {step === 0 && <FichaStep appt={appt} form={form} set={set} />}
          {step === 1 && <ProcedimentoStep appt={appt} form={form} set={set} />}
          {step === 2 && <ConsumoStep form={form} set={set} />}
          {step === 3 && <FotosStep form={form} set={set} />}
          {step === 4 && <PagamentoStep appt={appt} form={form} set={set} />}
          {step === 5 && <FinalizarStep form={form} />}
        </CardContent>
      </Card>

      {/* Footer nav */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(step-1) : onExit()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {step > 0 ? 'Voltar' : 'Sair'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step+1)}>Próximo <ArrowRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={finalize} className="bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 mr-1" /> Finalizar e Cobrar</Button>
        )}
      </div>

      {/* Checkout Modal */}
      {appt && (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={(v) => { setCheckoutOpen(v); if (!v) onExit() }}
          clientId={appt.clientId}
          clientName={appt.client?.name ?? 'Cliente'}
          initialSaleId={checkoutSaleId}
          onPaid={() => { setCheckoutOpen(false); onExit() }}
        />
      )}
    </div>
  )
}

function FichaStep({ appt, form, set }: any) {
  const { data } = useFetch<any>(`/api/clients/${appt.clientId}`)
  const c = data?.client
  if (!c) return <p className="text-muted-foreground">Carregando ficha…</p>
  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Ficha resumida da cliente</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Info label="Classificação" value={c.classification} />
        <Info label="Última visita" value={c.lastVisit ? formatDate(c.lastVisit) : 'Primeira'} />
        <Info label="Total visitas" value={String(c.totalVisits)} />
        <Info label="Tipo de pele" value={c.skinType} />
        <Info label="Sensibilidade" value={c.sensitivity} />
        <Info label="Alergias" value={c.allergies} red />
      </div>
      {(c.eyeShape || c.lashCurvature) && (
        <>
          <h4 className="text-sm font-semibold flex items-center gap-2 mt-4"><Eye className="w-4 h-4 text-purple-500" /> Avaliação de cílios</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Info label="Formato olhos" value={c.eyeShape} />
            <Info label="Tipo de fio" value={c.lashType} />
            <Info label="Espessura" value={c.lashThickness} />
            <Info label="Curvatura" value={c.lashCurvature} />
            <Info label="Densidade" value={c.lashDensity} />
            <Info label="Comprimento" value={c.lashLength} />
            <Info label="Sensibilidade" value={c.lashSensitivity} red />
            <Info label="Alergias cílios" value={c.lashAllergies} red />
          </div>
        </>
      )}
      {(c.restrictions || c.contraindications || c.profObservations) && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 text-sm">
          <p className="font-semibold text-red-700 dark:text-red-400 mb-1">⚠️ Alertas</p>
          {c.restrictions && <p><strong>Restrições:</strong> {c.restrictions}</p>}
          {c.contraindications && <p><strong>Contraindicações:</strong> {c.contraindications}</p>}
          {c.profObservations && <p><strong>Obs. profissionais:</strong> {c.profObservations}</p>}
        </div>
      )}
    </div>
  )
}

function ProcedimentoStep({ appt, form, set }: any) {
  const { data: settingsData } = useFetch<any>('/api/settings')
  const { data: mapData } = useFetch<any>(`/api/lash-mappings?clientId=${appt.clientId}`)
  const techniques = useMemo(() => { try { return JSON.parse(settingsData?.settings?.lash_techniques ?? '[]') } catch { return [] } }, [settingsData])
  const effects = useMemo(() => { try { return JSON.parse(settingsData?.settings?.lash_effects ?? '[]') } catch { return [] } }, [settingsData])
  const defaultMap = mapData?.mappings?.find((m:any) => m.isDefault) ?? mapData?.mappings?.[0]

  const applyMap = () => {
    if (!defaultMap) { return }
    set('mapping', defaultMap.id)
    set('lengths', JSON.parse(defaultMap.leftEye).join('|') + ' | ' + JSON.parse(defaultMap.rightEye).join('|'))
    set('curvature', defaultMap.curvature)
    set('thickness', defaultMap.thickness)
    set('technique', defaultMap.technique)
    set('effect', defaultMap.effect)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-purple-500" /> Registro do procedimento</h3>
        {defaultMap && <Button size="sm" variant="outline" onClick={applyMap}><Sparkles className="w-4 h-4 mr-1" /> Aplicar mapping padrão</Button>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Técnica">
          <Select value={form.technique} onValueChange={(v) => set('technique', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{(techniques.length ? techniques : ['Fio a Fio','Volume Brasileiro','Volume Russo']).map((t:string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Efeito">
          <Select value={form.effect} onValueChange={(v) => set('effect', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{(effects.length ? effects : ['Natural','Clássico','Gatinho']).map((t:string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Curvatura">
          <Select value={form.curvature} onValueChange={(v) => set('curvature', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['J','B','C','CC','D','M'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Espessura">
          <Select value={form.thickness} onValueChange={(v) => set('thickness', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['0.03','0.05','0.07','0.10','0.15','0.20'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Cola utilizada"><Input value={form.glue} onChange={(e) => set('glue', e.target.value)} placeholder="Ex: Cola Premium 5g" /></Field>
        <Field label="Lote da cola"><Input value={form.glueLot} onChange={(e) => set('glueLot', e.target.value)} /></Field>
        <Field label="Duração (min)"><Input type="number" value={form.duration} onChange={(e) => set('duration', parseInt(e.target.value))} /></Field>
        <Field label="Intervalo manutenção (dias)"><Input type="number" value={form.nextMaintenanceDays} onChange={(e) => set('nextMaintenanceDays', parseInt(e.target.value))} /></Field>
      </div>
      <Field label="Comprimentos por região (mapping)"><Input value={form.lengths} onChange={(e) => set('lengths', e.target.value)} placeholder="Ex: 8|9|10|11|12|11|10|9" /></Field>
      <Field label="Observações do procedimento"><Textarea rows={2} value={form.observation} onChange={(e) => set('observation', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Reações observadas"><Textarea rows={2} value={form.reactions} onChange={(e) => set('reactions', e.target.value)} /></Field>
        <Field label="Recomendações"><Textarea rows={2} value={form.recommendations} onChange={(e) => set('recommendations', e.target.value)} /></Field>
      </div>
    </div>
  )
}

function ConsumoStep({ form, set }: any) {
  const { data } = useFetch<any>('/api/products')
  const { toast } = useToast()
  const products = data?.products ?? []
  // Sugestão automática a partir da ficha técnica do serviço
  const { data: svcData } = useFetch<any>('/api/services')
  const suggested = useMemo(() => {
    if (!form.serviceId) return []
    const svc = svcData?.services?.find((s:any) => s.id === form.serviceId)
    return svc?.consumption ?? []
  }, [svcData, form.serviceId])

  const applySuggested = () => {
    set('consumptions', suggested.map((c:any) => ({ productId: c.product?.id ?? c.productId, name: c.product?.name, quantity: c.quantity, unit: c.unit, lot: '' })))
    toast({ title: 'Ficha técnica carregada' })
  }

  const addManual = () => set('consumptions', [...form.consumptions, { productId: '', name: '', quantity: 1, unit: 'un', lot: '' }])
  const remove = (i: number) => set('consumptions', form.consumptions.filter((_:any, idx:number) => idx !== i))
  const update = (i: number, k: string, v: any) => set('consumptions', form.consumptions.map((c:any, idx:number) => idx === i ? { ...c, [k]: v } : c))

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-amber-500" /> Consumo de materiais</h3>
        <div className="flex gap-2">
          {suggested.length > 0 && <Button size="sm" variant="outline" onClick={applySuggested}><Sparkles className="w-4 h-4 mr-1" /> Ficha técnica</Button>}
          <Button size="sm" variant="outline" onClick={addManual}><Plus className="w-4 h-4 mr-1" /> Item</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Os produtos serão baixados do estoque ao finalizar o atendimento.</p>
      {form.consumptions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item adicionado. Use "Ficha técnica" para preencher automaticamente.</p>
      ) : (
        <div className="space-y-2">
          {form.consumptions.map((c: any, i: number) => (
            <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
              <Select value={c.productId} onValueChange={(v) => {
                const p = products.find((x:any) => x.id === v)
                const newConsumptions = [...form.consumptions]
                newConsumptions[i] = { ...newConsumptions[i], productId: v, name: p?.name ?? '', unit: p?.unit ?? 'un' }
                set('consumptions', newConsumptions)
              }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent className="max-h-60">{products.map((p:any) => <SelectItem key={p.id} value={p.id}>{p.name} (estoque: {p.stock})</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" step="0.01" value={c.quantity} onChange={(e) => update(i, 'quantity', parseFloat(e.target.value))} className="w-20" />
              <Input value={c.lot} onChange={(e) => update(i, 'lot', e.target.value)} placeholder="Lote" className="w-24" />
              <Button size="icon" variant="ghost" onClick={() => remove(i)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FotosStep({ form, set }: any) {
  const fileRef = (i: number) => (document.getElementById(`photo-${i}`) as HTMLInputElement)
  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 3_000_000) return
    const reader = new FileReader()
    reader.onload = () => set('photos', [...form.photos, { category, url: reader.result, observation: '' }])
    reader.readAsDataURL(f)
  }
  const remove = (i: number) => set('photos', form.photos.filter((_:any, idx:number) => idx !== i))

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Camera className="w-4 h-4 text-pink-500" /> Registro fotográfico</h3>
      <div className="flex flex-wrap gap-2">
        {['antes','durante','depois','resultado'].map(cat => (
          <label key={cat} className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => addPhoto(e, cat)} />
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-card hover:bg-accent text-sm capitalize"><Plus className="w-3 h-3" /> {cat}</span>
          </label>
        ))}
      </div>
      {form.photos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma foto adicionada</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {form.photos.map((p: any, i: number) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
              <img src={p.url} alt={p.category} className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-[10px] text-white capitalize">{p.category}</p>
              </div>
              <button onClick={() => remove(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-destructive"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PagamentoStep({ appt, form, set }: any) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> Pagamento</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor do serviço"><Input type="number" step="0.01" value={appt.price} disabled /></Field>
        <Field label="Forma de pagamento">
          <Select value={form.paymentMethod} onValueChange={(v) => set('paymentMethod', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="credito">Cartão crédito</SelectItem>
              <SelectItem value="debito">Cartão débito</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Satisfação da cliente">
        <div className="flex gap-1">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => set('satisfaction', n)} className={`text-2xl ${n <= form.satisfaction ? 'text-amber-400' : 'text-muted-foreground/30'}`}>★</button>
          ))}
        </div>
      </Field>
      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 text-sm">
        <p className="font-semibold text-emerald-700 dark:text-emerald-400">✓ Comissão será calculada automaticamente</p>
        <p className="text-emerald-600 dark:text-emerald-500 text-xs">O profissional receberá a comissão configurada no serviço ao finalizar.</p>
      </div>
    </div>
  )
}

function FinalizarStep({ form }: any) {
  const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + (form.nextMaintenanceDays ?? 21))
  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Revisão e finalização</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Técnica" value={form.technique} />
        <Info label="Efeito" value={form.effect} />
        <Info label="Curvatura" value={form.curvature} />
        <Info label="Espessura" value={form.thickness} />
        <Info label="Duração" value={`${form.duration} min`} />
        <Info label="Pagamento" value={form.paymentMethod} />
        <Info label="Itens consumidos" value={String(form.consumptions.length)} />
        <Info label="Fotos" value={String(form.photos.length)} />
      </div>
      <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 p-4">
        <p className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Próxima manutenção sugerida</p>
        <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">{formatDate(nextDate)}</p>
        <p className="text-xs text-purple-600 dark:text-purple-500">Em {form.nextMaintenanceDays} dias — o sistema criará um alerta automático.</p>
      </div>
      <p className="text-xs text-muted-foreground">Ao finalizar: o procedimento será registrado no histórico da cliente, os produtos serão baixados do estoque, a comissão será calculada, e o alerta de manutenção será gerado.</p>
    </div>
  )
}

function Info({ label, value, red }: { label: string; value?: string | null; red?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${red && value ? 'text-red-600 dark:text-red-400' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
}
