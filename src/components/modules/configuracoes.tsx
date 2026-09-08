'use client'

import { useState, useEffect } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/format'
import { Save, Building2, MessageCircle, Eye, Bell, ShieldAlert, Plus, X } from 'lucide-react'

export default function ConfiguracoesModule() {
  return (
    <Tabs defaultValue="empresa">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="empresa"><Building2 className="w-4 h-4 mr-1" /> Empresa</TabsTrigger>
        <TabsTrigger value="whatsapp"><MessageCircle className="w-4 h-4 mr-1" /> WhatsApp</TabsTrigger>
        <TabsTrigger value="tecnicas"><Eye className="w-4 h-4 mr-1" /> Técnicas</TabsTrigger>
        <TabsTrigger value="automacoes"><Bell className="w-4 h-4 mr-1" /> Automações</TabsTrigger>
        <TabsTrigger value="auditoria"><ShieldAlert className="w-4 h-4 mr-1" /> Auditoria</TabsTrigger>
      </TabsList>
      <TabsContent value="empresa"><EmpresaTab /></TabsContent>
      <TabsContent value="whatsapp"><WhatsappTab /></TabsContent>
      <TabsContent value="tecnicas"><TecnicasTab /></TabsContent>
      <TabsContent value="automacoes"><AutomacoesTab /></TabsContent>
      <TabsContent value="auditoria"><AuditoriaTab /></TabsContent>
    </Tabs>
  )
}

function EmpresaTab() {
  const { data, reload } = useFetch<any>('/api/settings')
  const { toast } = useToast()
  const [form, setForm] = useState<any>({})
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(data?.settings ?? {})
  }, [data])
  const set = (k: string, v: string) => setForm((f:any) => ({ ...f, [k]: v }))

  const save = async () => {
    const keys = ['companyName','companyPhone','companyAddress','companyInstagram','inactivityDays','birthdayAdvance']
    const settings: any = {}
    for (const k of keys) settings[k] = form[k] ?? ''
    await apiPost('/api/settings', { settings })
    toast({ title: 'Configurações salvas' }); reload()
  }

  return (
    <Card><CardHeader><CardTitle className="text-base">Dados da empresa</CardTitle></CardHeader>
      <CardContent className="space-y-3 max-w-2xl">
        <Field label="Nome da empresa"><Input value={form.companyName ?? ''} onChange={(e) => set('companyName', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone"><Input value={form.companyPhone ?? ''} onChange={(e) => set('companyPhone', e.target.value)} /></Field>
          <Field label="Instagram"><Input value={form.companyInstagram ?? ''} onChange={(e) => set('companyInstagram', e.target.value)} /></Field>
        </div>
        <Field label="Endereço"><Input value={form.companyAddress ?? ''} onChange={(e) => set('companyAddress', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dias p/ inatividade"><Input type="number" value={form.inactivityDays ?? '60'} onChange={(e) => set('inactivityDays', e.target.value)} /></Field>
          <Field label="Antecedência aniversário (dias)"><Input type="number" value={form.birthdayAdvance ?? '1'} onChange={(e) => set('birthdayAdvance', e.target.value)} /></Field>
        </div>
        <Button onClick={save}><Save className="w-4 h-4 mr-1" /> Salvar</Button>
      </CardContent>
    </Card>
  )
}

function WhatsappTab() {
  const { data, reload } = useFetch<any>('/api/settings')
  const { toast } = useToast()
  const [form, setForm] = useState<any>({})
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(data?.settings ?? {})
  }, [data])
  const set = (k: string, v: string) => setForm((f:any) => ({ ...f, [k]: v }))

  const save = async () => {
    await apiPost('/api/settings', { settings: { whatsappProvider: form.whatsappProvider ?? 'none', whatsappApiUrl: form.whatsappApiUrl ?? '', whatsappApiKey: form.whatsappApiKey ?? '', whatsappInstance: form.whatsappInstance ?? '' } })
    toast({ title: 'Configurações salvas' }); reload()
  }

  const testConnection = async () => {
    if (!testPhone || !form.whatsappApiUrl || !form.whatsappApiKey || !form.whatsappInstance) {
      toast({ title: 'Preencha todos os campos e o telefone de teste', variant: 'destructive' })
      return
    }
    setTesting(true)
    try {
      const res = await apiPost('/api/whatsapp/test', {
        url: form.whatsappApiUrl,
        apiKey: form.whatsappApiKey,
        instance: form.whatsappInstance,
        phone: testPhone
      })
      if (res.error) throw new Error(res.error)
      toast({ title: 'Conexão bem sucedida!', description: 'Mensagem de teste enviada.' })
    } catch (e: any) {
      toast({ title: 'Erro no teste', description: e.message, variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card><CardHeader><CardTitle className="text-base">Integração WhatsApp</CardTitle></CardHeader>
      <CardContent className="space-y-3 max-w-2xl">
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-700 dark:text-amber-400">
          Configure seu provedor de WhatsApp. Se não configurado, as mensagens são apenas registradas no sistema (status "sent" simulado).
        </div>
        <Field label="Provedor">
          <Select value={form.whatsappProvider ?? 'none'} onValueChange={(v) => set('whatsappProvider', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhum (apenas registro)</SelectItem><SelectItem value="evolution">Evolution API</SelectItem><SelectItem value="cloud">WhatsApp Cloud API</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="URL da API"><Input value={form.whatsappApiUrl ?? ''} onChange={(e) => set('whatsappApiUrl', e.target.value)} placeholder="https://api.exemplo.com" /></Field>
        <Field label="Chave da API"><Input type="password" value={form.whatsappApiKey ?? ''} onChange={(e) => set('whatsappApiKey', e.target.value)} /></Field>
        <Field label="Instância"><Input value={form.whatsappInstance ?? ''} onChange={(e) => set('whatsappInstance', e.target.value)} /></Field>
        <Button onClick={save}><Save className="w-4 h-4 mr-1" /> Salvar</Button>
        
        {form.whatsappProvider === 'evolution' && (
          <div className="pt-4 border-t mt-4 space-y-3">
            <h4 className="font-medium text-sm">Teste de Conexão</h4>
            <div className="flex gap-2">
              <Input 
                placeholder="Número WhatsApp (ex: 5511999999999)" 
                value={testPhone} 
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button variant="secondary" onClick={testConnection} disabled={testing}>
                {testing ? 'Testando...' : 'Testar Conexão'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TecnicasTab() {
  const { data, reload } = useFetch<any>('/api/settings')
  const { toast } = useToast()
  const [techniques, setTechniques] = useState<string[]>([])
  const [effects, setEffects] = useState<string[]>([])
  const [newTech, setNewTech] = useState('')
  const [newEff, setNewEff] = useState('')

  useEffect(() => {
    let t: string[] = []; let e: string[] = []
    try { t = JSON.parse(data?.settings?.lash_techniques ?? '[]') } catch {}
    try { e = JSON.parse(data?.settings?.lash_effects ?? '[]') } catch {}
  }, [data])

  const saveTech = async (arr: string[], key: string) => {
    await apiPost('/api/settings', { key, value: JSON.stringify(arr) })
    toast({ title: 'Salvo' }); reload()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card><CardHeader><CardTitle className="text-base">Técnicas de cílios</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {techniques.map((t) => <Badge key={t} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">{t}<button onClick={() => saveTech(techniques.filter(x => x !== t), 'lash_techniques')} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button></Badge>)}
            {techniques.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma técnica</p>}
          </div>
          <div className="flex gap-2">
            <Input value={newTech} onChange={(e) => setNewTech(e.target.value)} placeholder="Nova técnica…" onKeyDown={(e) => { if (e.key === 'Enter' && newTech.trim()) { const arr = [...techniques, newTech.trim()]; setTechniques(arr); setNewTech(''); saveTech(arr, 'lash_techniques') } }} />
            <Button onClick={() => { if (newTech.trim()) { const arr = [...techniques, newTech.trim()]; setTechniques(arr); setNewTech(''); saveTech(arr, 'lash_techniques') } }}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Efeitos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {effects.map((t) => <Badge key={t} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">{t}<button onClick={() => saveTech(effects.filter(x => x !== t), 'lash_effects')} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button></Badge>)}
            {effects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum efeito</p>}
          </div>
          <div className="flex gap-2">
            <Input value={newEff} onChange={(e) => setNewEff(e.target.value)} placeholder="Novo efeito…" onKeyDown={(e) => { if (e.key === 'Enter' && newEff.trim()) { const arr = [...effects, newEff.trim()]; setEffects(arr); setNewEff(''); saveTech(arr, 'lash_effects') } }} />
            <Button onClick={() => { if (newEff.trim()) { const arr = [...effects, newEff.trim()]; setEffects(arr); setNewEff(''); saveTech(arr, 'lash_effects') } }}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AutomacoesTab() {
  const { data, reload } = useFetch<any>('/api/settings')
  const { toast } = useToast()
  const [autos, setAutos] = useState<any>({})
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutos({
      auto_birthday: data?.settings?.auto_birthday === '1',
      auto_maintenance: data?.settings?.auto_maintenance === '1',
      auto_inactive: data?.settings?.auto_inactive === '1',
      auto_reminder: data?.settings?.auto_reminder === '1',
    })
  }, [data])

  const toggle = async (key: string, v: boolean) => {
    setAutos((a:any) => ({ ...a, [key]: v }))
    await apiPost('/api/settings', { key, value: v ? '1' : '0' })
    toast({ title: v ? 'Automação ativada' : 'Automação desativada' })
    reload()
  }

  const items = [
    { key: 'auto_birthday', title: 'Aniversários', desc: 'Gerar alertas e sugerir mensagens de aniversário' },
    { key: 'auto_maintenance', title: 'Manutenção de cílios', desc: 'Alertar quando manutenções estiverem vencidas ou próximas' },
    { key: 'auto_inactive', title: 'Clientes inativas', desc: 'Alertar sobre clientes sem atendimento há mais de X dias' },
    { key: 'auto_reminder', title: 'Lembrete de agendamento', desc: 'Sugerir envio de lembrete para agendamentos do dia seguinte' },
  ]

  return (
    <Card><CardHeader><CardTitle className="text-base">Automações</CardTitle></CardHeader>
      <CardContent className="space-y-3 max-w-2xl">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between p-3 border rounded-lg">
            <div><p className="font-medium text-sm">{it.title}</p><p className="text-xs text-muted-foreground">{it.desc}</p></div>
            <Switch checked={autos[it.key]} onCheckedChange={(v) => toggle(it.key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function AuditoriaTab() {
  const { data, loading } = useFetch<any>('/api/audit-logs')
  const logs = data?.logs ?? []

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" /> Auditoria do sistema (LGPD)</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? <p className="p-4 text-center text-muted-foreground">Carregando…</p> :
          logs.length === 0 ? <p className="p-8 text-center text-muted-foreground">Nenhum registro</p> :
          <div className="max-h-[70vh] overflow-y-auto scroll-thin">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr><th className="text-left p-2">Data</th><th className="text-left p-2">Usuário</th><th className="text-left p-2">Ação</th><th className="text-left p-2">Entidade</th><th className="text-left p-2">Detalhe</th></tr>
              </thead>
              <tbody>
                {logs.map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 text-xs whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                    <td className="p-2 text-xs">{l.user?.name ?? '—'}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">{l.action}</Badge></td>
                    <td className="p-2 text-xs">{l.entity}</td>
                    <td className="p-2 text-xs text-muted-foreground truncate max-w-xs">{l.newValue?.slice(0, 80) ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
}
