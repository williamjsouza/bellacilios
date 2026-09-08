'use client'

import { useState } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/format'
import { MessageCircle, Send, Edit, FileText, Clock, CheckCheck, AlertCircle, Plus } from 'lucide-react'

const STATUS_CONFIG: Record<string, any> = {
  queued: { label: 'Na fila', color: 'bg-slate-100 text-slate-600', icon: Clock },
  sending: { label: 'Enviando', color: 'bg-amber-100 text-amber-700', icon: Send },
  sent: { label: 'Enviada', color: 'bg-green-100 text-green-700', icon: CheckCheck },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700', icon: CheckCheck },
  read: { label: 'Lida', color: 'bg-blue-100 text-blue-700', icon: CheckCheck },
  error: { label: 'Erro', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

export default function WhatsappModule() {
  return (
    <Tabs defaultValue="messages">
      <TabsList>
        <TabsTrigger value="messages"><MessageCircle className="w-4 h-4 mr-1" /> Mensagens</TabsTrigger>
        <TabsTrigger value="templates"><FileText className="w-4 h-4 mr-1" /> Templates</TabsTrigger>
        <TabsTrigger value="status"><Send className="w-4 h-4 mr-1" /> Fila/Status</TabsTrigger>
      </TabsList>
      <TabsContent value="messages"><MessagesTab /></TabsContent>
      <TabsContent value="templates"><TemplatesTab /></TabsContent>
      <TabsContent value="status"><StatusTab /></TabsContent>
    </Tabs>
  )
}

function MessagesTab() {
  const { data, loading, reload } = useFetch<any>('/api/whatsapp/messages')
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const { data: clientsData } = useFetch<any>(`/api/clients?q=${q}`)
  const { data: tplData } = useFetch<any>('/api/whatsapp/templates')
  const [clientId, setClientId] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [preview, setPreview] = useState('')
  const [sending, setSending] = useState(false)

  const messages = data?.messages ?? []

  const onTemplateChange = async (key: string) => {
    setTemplateKey(key)
    const tpl = tplData?.templates?.find((t:any) => t.key === key)
    if (tpl && clientId) {
      // buscar preview
      const r = await fetch('/api/whatsapp/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ clientId, template: key }) })
      // não enviar de verdade — apenas preview via render. Vamos só mostrar o template:
      setPreview(tpl.content)
    } else if (tpl) {
      setPreview(tpl.content)
    }
  }

  const send = async () => {
    if (!clientId || !templateKey) { toast({ title: 'Selecione cliente e template', variant: 'destructive' }); return }
    setSending(true)
    try {
      await apiPost('/api/whatsapp/send', { clientId, template: templateKey })
      toast({ title: 'Mensagem enviada' })
      setOpen(false); setClientId(''); setTemplateKey(''); setPreview('')
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setSending(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{messages.length} mensagem(s) registrada(s)</p>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Enviar mensagem</Button>
      </div>

      {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
        messages.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma mensagem enviada ainda</CardContent></Card> :
        <Card><CardContent className="p-0">
          <div className="divide-y max-h-[70vh] overflow-y-auto scroll-thin">
            {messages.map((m: any) => {
              const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.queued
              return (
                <div key={m.id} className="p-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0"><MessageCircle className="w-4 h-4 text-green-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium truncate">{m.client?.name ?? m.to}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Template: {m.template ?? m.type}</p>
                    <p className="text-sm mt-1 line-clamp-2">{m.content}</p>
                  </div>
                  <Badge className={cfg.color}><cfg.icon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      }

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar mensagem WhatsApp</DialogTitle><DialogDescription>A mensagem será personalizada com os dados da cliente</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" />
              {q && clientsData?.clients?.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto scroll-thin">
                  {clientsData.clients.slice(0, 8).map((c:any) => (
                    <button key={c.id} onClick={() => { setClientId(c.id); setQ(c.name) }} className="w-full text-left p-2 hover:bg-accent text-sm">{c.name} · {c.whatsapp}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={templateKey || undefined} onValueChange={onTemplateChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{(tplData?.templates ?? []).map((t:any) => <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {preview && (
              <div className="space-y-1.5">
                <Label>Prévia</Label>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 text-sm whitespace-pre-wrap">{preview}</div>
                <p className="text-[10px] text-muted-foreground">Variáveis como {'{{nome}}'}, {'{{empresa}}'}, {'{{data}}'} serão substituídas automaticamente no envio.</p>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={send} disabled={sending}>{sending ? 'Enviando…' : 'Enviar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplatesTab() {
  const { data, loading, reload } = useFetch<any>('/api/whatsapp/templates')
  const { toast } = useToast()
  const [editing, setEditing] = useState<any>(null)
  const [content, setContent] = useState('')

  const save = async () => {
    if (!editing) return
    try {
      await apiPost('/api/whatsapp/templates', { id: editing.id, content, name: editing.name, active: editing.active })
      toast({ title: 'Template atualizado' })
      setEditing(null); reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <div className="space-y-3">
      <Card className="bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Variáveis disponíveis</p>
          {'{{nome}} {{empresa}} {{data}} {{hora}} {{profissional}} {{servico}} {{brinde}} {{desconto}}'}
        </CardContent>
      </Card>
      {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.templates?.map((t: any) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant={t.active ? 'default' : 'secondary'}>{t.active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Chave: {t.key}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.content}</p>
                <Button size="sm" variant="outline" onClick={() => { setEditing(t); setContent(t.content) }}><Edit className="w-3 h-3 mr-1" /> Editar</Button>
              </CardContent>
            </Card>
          ))}
        </div>}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar template</DialogTitle><DialogDescription>{editing?.name}</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusTab() {
  const { data, loading } = useFetch<any>('/api/whatsapp/messages')
  const messages = data?.messages ?? []
  const counts = {
    queued: messages.filter(m => m.status === 'queued').length,
    sent: messages.filter(m => m.status === 'sent' || m.status === 'delivered').length,
    read: messages.filter(m => m.status === 'read').length,
    error: messages.filter(m => m.status === 'error').length,
  }
  const errors = messages.filter(m => m.status === 'error')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Na fila</p><p className="text-2xl font-bold">{counts.queued}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Enviadas (total)</p><p className="text-2xl font-bold text-green-600">{counts.sent}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lidas</p><p className="text-2xl font-bold text-blue-600">{counts.read}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Erros</p><p className="text-2xl font-bold text-red-600">{counts.error}</p></CardContent></Card>
      </div>
      {errors.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Mensagens com erro</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errors.map((m:any) => (
                <div key={m.id} className="p-2 border rounded-md text-sm">
                  <p className="font-medium">{m.client?.name ?? m.to}</p>
                  <p className="text-xs text-muted-foreground">{m.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {!loading && counts.error === 0 && counts.queued === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">Sem pendências. Tudo enviado!</CardContent></Card>}
    </div>
  )
}
