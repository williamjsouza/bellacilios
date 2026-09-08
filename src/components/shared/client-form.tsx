'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { apiPost } from '@/lib/use-fetch'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  client?: any
  onSaved: (c: any) => void
}

const CLASSIFICATIONS = ['Nova', 'Ativa', 'Frequente', 'VIP', 'Inativa', 'Perdida']
const SOURCES = ['Instagram', 'Facebook', 'Google', 'Indicação', 'Passagem', 'Parceria', 'Outro']
const EYE_SHAPES = ['Aveludados', 'Puxados', 'Caídos', 'Grandes', 'Pequenos', 'Redondos', 'Amendoados']
const LASH_TYPES = ['Reto', 'Cacheado', 'Misto']
const LASH_THICK = ['Fino', 'Médio', 'Grosso']
const LASH_CURV = ['J', 'B', 'C', 'CC', 'D', 'M']
const LASH_DENSITY = ['Baixa', 'Média', 'Alta']
const LASH_LENGTH = ['Curto', 'Médio', 'Longo']

const empty = {
  name: '', socialName: '', cpf: '', rg: '', birthDate: '', gender: 'F',
  phone: '', whatsapp: '', email: '', cep: '', address: '', city: '', state: '',
  instagram: '', profession: '', source: '', observations: '',
  skinType: '', sensitivity: '', allergies: '', restrictions: '', preferences: '', contraindications: '', profObservations: '',
  eyeShape: '', lashType: '', lashThickness: '', lashCurvature: '', lashDensity: '', lashLength: '',
  lashSensitivity: '', lashAllergies: '', lashIrritations: '', lashObservations: '',
  classification: 'Nova', responsible: '',
}

export function ClientForm({ open, onOpenChange, client, onSaved }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState<any>(client ?? empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(client ?? empty)
  }, [open, client])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name?.trim()) { toast({ title: 'Nome é obrigatório', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload: any = {}
      for (const k of Object.keys(empty)) {
        payload[k] = form[k]
      }
      if (client?.id) payload.id = client.id
      const r = await apiPost('/api/clients', payload)
      toast({ title: client?.id ? 'Cliente atualizada' : 'Cliente cadastrada' })
      onSaved(r.client)
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setForm(empty); onOpenChange(o) }}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{client?.id ? 'Editar cliente' : 'Nova cliente'}</DialogTitle>
          <DialogDescription>Preencha os dados cadastrais e de estética</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Dados pessoais</TabsTrigger>
            <TabsTrigger value="esthetic">Estética</TabsTrigger>
            <TabsTrigger value="lash">Avaliação Cílios</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[55vh] pr-3 scroll-thin">
            <TabsContent value="basic" className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome completo *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
                <Field label="Nome social / apelido"><Input value={form.socialName} onChange={(e) => set('socialName', e.target.value)} /></Field>
                <Field label="CPF"><Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} /></Field>
                <Field label="RG"><Input value={form.rg} onChange={(e) => set('rg', e.target.value)} /></Field>
                <Field label="Data de nascimento"><Input type="date" value={form.birthDate ? new Date(form.birthDate).toISOString().slice(0,10) : ''} onChange={(e) => set('birthDate', e.target.value)} /></Field>
                <Field label="Sexo">
                  <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="F">Feminino</SelectItem><SelectItem value="M">Masculino</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Telefone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
                <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="5511999999999" /></Field>
                <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
                <Field label="Instagram"><Input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} /></Field>
                <Field label="Profissão"><Input value={form.profession} onChange={(e) => set('profession', e.target.value)} /></Field>
                <Field label="Como conheceu">
                  <Select value={form.source} onValueChange={(v) => set('source', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="CEP"><Input value={form.cep} onChange={(e) => set('cep', e.target.value)} /></Field>
                <Field label="Endereço"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
                <Field label="Cidade"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
                <Field label="Estado"><Input value={form.state} onChange={(e) => set('state', e.target.value)} maxLength={2} /></Field>
                <Field label="Classificação">
                  <Select value={form.classification} onValueChange={(v) => set('classification', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Profissional responsável"><Input value={form.responsible} onChange={(e) => set('responsible', e.target.value)} /></Field>
              </div>
              <Field label="Observações gerais"><Textarea value={form.observations} onChange={(e) => set('observations', e.target.value)} rows={2} /></Field>
            </TabsContent>

            <TabsContent value="esthetic" className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo de pele"><Input value={form.skinType} onChange={(e) => set('skinType', e.target.value)} placeholder="Seca, oleosa, mista…" /></Field>
                <Field label="Sensibilidade"><Input value={form.sensitivity} onChange={(e) => set('sensitivity', e.target.value)} /></Field>
                <Field label="Alergias"><Input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} /></Field>
                <Field label="Restrições"><Input value={form.restrictions} onChange={(e) => set('restrictions', e.target.value)} /></Field>
                <Field label="Preferências"><Input value={form.preferences} onChange={(e) => set('preferences', e.target.value)} /></Field>
                <Field label="Contraindicações"><Input value={form.contraindications} onChange={(e) => set('contraindications', e.target.value)} /></Field>
              </div>
              <Field label="Observações profissionais"><Textarea value={form.profObservations} onChange={(e) => set('profObservations', e.target.value)} rows={3} /></Field>
            </TabsContent>

            <TabsContent value="lash" className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">Avaliação inicial para procedimentos de cílios</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Formato dos olhos">
                  <Select value={form.eyeShape} onValueChange={(v) => set('eyeShape', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{EYE_SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Tipo de fio natural">
                  <Select value={form.lashType} onValueChange={(v) => set('lashType', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{LASH_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Espessura dos fios">
                  <Select value={form.lashThickness} onValueChange={(v) => set('lashThickness', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{LASH_THICK.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Curvatura natural">
                  <Select value={form.lashCurvature} onValueChange={(v) => set('lashCurvature', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{LASH_CURV.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Densidade dos fios">
                  <Select value={form.lashDensity} onValueChange={(v) => set('lashDensity', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{LASH_DENSITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Comprimento">
                  <Select value={form.lashLength} onValueChange={(v) => set('lashLength', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{LASH_LENGTH.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Sensibilidade ocular"><Input value={form.lashSensitivity} onChange={(e) => set('lashSensitivity', e.target.value)} /></Field>
                <Field label="Histórico de alergias"><Input value={form.lashAllergies} onChange={(e) => set('lashAllergies', e.target.value)} /></Field>
              </div>
              <Field label="Irritações anteriores"><Textarea value={form.lashIrritations} onChange={(e) => set('lashIrritations', e.target.value)} rows={2} /></Field>
              <Field label="Observações de cílios"><Textarea value={form.lashObservations} onChange={(e) => set('lashObservations', e.target.value)} rows={2} /></Field>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
