'use client'

import { useState, useMemo } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Plus, FileText, Trash2, MessageCircle, Check, X, ShoppingCart, Eye, ChevronsUpDown } from 'lucide-react'

const STATUS_CONFIG: Record<string, any> = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-700' },
  expirado: { label: 'Expirado', color: 'bg-amber-100 text-amber-700' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-500' },
}

export default function OrcamentosModule() {
  const { data, loading, reload } = useFetch<any>('/api/quotes')
  const [filter, setFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const { toast } = useToast()

  const quotes = (data?.quotes ?? []).filter((q:any) => filter === 'all' || q.status === filter)

  const changeStatus = async (q: any, status: string) => {
    try {
      await apiPost(`/api/quotes/${q.id}`, { status }, 'PUT')
      toast({ title: 'Status atualizado' })
      reload()
      if (detail?.id === q.id) setDetail({ ...q, status })
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  const sendWhatsapp = async (q: any) => {
    try {
      const content = `Olá ${q.client.name}! Segue seu orçamento:\n${q.items.map((i:any) => `• ${i.description} — ${formatCurrency(i.total)}`).join('\n')}\nTotal: ${formatCurrency(q.total)}\nVálido até: ${formatDate(q.validUntil)}`
      await apiPost('/api/whatsapp/send', { clientId: q.clientId, customContent: content })
      await apiPost(`/api/quotes/${q.id}`, { status: 'enviado' }, 'PUT')
      toast({ title: 'Orçamento enviado por WhatsApp' })
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  const convertToSale = async (q: any) => {
    try {
      // criar venda a partir do orçamento
      const sale = await apiPost('/api/finance/receivable', { clientId: q.clientId, description: `Venda do orçamento ${q.id.slice(-6)}`, amount: q.total, dueDate: new Date().toISOString().slice(0,10) })
      await apiPost(`/api/quotes/${q.id}`, { status: 'aprovado' }, 'PUT')
      toast({ title: 'Convertido em venda! Conta a receber criada.' })
      reload()
      setDetail(null)
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-xl font-semibold">Orçamentos</h2>
          <p className="text-sm text-muted-foreground">{quotes.length} orçamento(s)</p>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1" /> Novo orçamento</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
            {s === 'all' ? 'Todos' : STATUS_CONFIG[s].label}
          </Button>
        ))}
      </div>

      {loading ? <div className="p-8 text-center text-muted-foreground">Carregando…</div> :
        quotes.length === 0 ? <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhum orçamento</CardContent></Card> :
        <div className="space-y-2">
          {quotes.map((q: any) => (
            <Card key={q.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{q.client?.name}</p>
                    <Badge className={STATUS_CONFIG[q.status]?.color}>{STATUS_CONFIG[q.status]?.label ?? q.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(q.createdAt)} · {q.items?.length ?? 0} item(s) · Válido até {formatDate(q.validUntil)}</p>
                </div>
                <p className="font-semibold hidden sm:block">{formatCurrency(q.total)}</p>
                <Button size="sm" variant="outline" onClick={() => setDetail(q)}><Eye className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>}

      <QuoteForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => { reload(); setFormOpen(false) }} />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Orçamento — {detail?.client?.name}</DialogTitle><DialogDescription>Criado em {formatDate(detail?.createdAt)} · Válido até {formatDate(detail?.validUntil)}</DialogDescription></DialogHeader>
          {detail && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-thin pr-2">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qtd</th><th className="text-right p-2">Valor</th><th className="text-right p-2">Total</th></tr></thead>
                  <tbody>
                    {detail.items?.map((it:any) => (
                      <tr key={it.id} className="border-t"><td className="p-2">{it.description}</td><td className="text-right p-2">{it.quantity}</td><td className="text-right p-2">{formatCurrency(it.unitPrice)}</td><td className="text-right p-2">{formatCurrency(it.total)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-semibold"><tr><td colSpan={3} className="text-right p-2">Total</td><td className="text-right p-2">{formatCurrency(detail.total)}</td></tr></tfoot>
                </table>
              </div>
              {detail.observations && <p className="text-sm text-muted-foreground">{detail.observations}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => sendWhatsapp(detail)}><MessageCircle className="w-4 h-4 mr-1" /> Enviar WhatsApp</Button>
                {detail.status !== 'aprovado' && <Button size="sm" variant="outline" className="text-green-600" onClick={() => convertToSale(detail)}><ShoppingCart className="w-4 h-4 mr-1" /> Converter em venda</Button>}
                {detail.status === 'enviado' && <Button size="sm" variant="outline" className="text-green-600" onClick={() => changeStatus(detail, 'aprovado')}><Check className="w-4 h-4 mr-1" /> Aprovar</Button>}
                {detail.status === 'enviado' && <Button size="sm" variant="outline" className="text-red-600" onClick={() => changeStatus(detail, 'recusado')}><X className="w-4 h-4 mr-1" /> Recusar</Button>}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { if (confirm('Excluir?')) { await fetch(`/api/quotes/${detail.id}`, { method: 'DELETE' }); reload(); setDetail(null) } }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuoteForm({ open, onOpenChange, onSaved }: any) {
  const { toast } = useToast()
  const { data: clientsData } = useFetch<any>('/api/clients')
  const { data: svcData } = useFetch<any>('/api/services?active=1')
  const { data: profData } = useFetch<any>('/api/professionals?active=1')
  const [form, setForm] = useState<any>({ clientId: '', professionalId: '', validUntil: new Date(Date.now() + 30*86400000).toISOString().slice(0,10), discount: 0, addition: 0, observations: '', items: [] })
  const [saving, setSaving] = useState(false)
  const [clientOpen, setClientOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)

  const addItem = (svc?: any) => {
    setForm((f:any) => ({ ...f, items: [...f.items, { serviceId: svc?.id ?? '', productId: '', description: svc?.name ?? '', quantity: 1, unitPrice: svc?.price ?? 0, total: svc?.price ?? 0 }] }))
  }
  const updateItem = (i: number, k: string, v: any) => {
    setForm((f:any) => {
      const items = [...f.items]
      items[i] = { ...items[i], [k]: v }
      items[i].total = (items[i].quantity || 1) * (items[i].unitPrice || 0)
      return { ...f, items }
    })
  }
  const removeItem = (i: number) => setForm((f:any) => ({ ...f, items: f.items.filter((_:any, idx:number) => idx !== i) }))

  const subtotal = form.items.reduce((s:number, it:any) => s + it.total, 0)
  const total = subtotal - (form.discount || 0) + (form.addition || 0)

  const save = async () => {
    if (!form.clientId) { toast({ title: 'Selecione a cliente', variant: 'destructive' }); return }
    if (form.items.length === 0) { toast({ title: 'Adicione ao menos 1 item', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await apiPost('/api/quotes', { ...form, total, status: 'rascunho' })
      toast({ title: 'Orçamento criado' })
      setForm({ clientId: '', professionalId: '', validUntil: new Date(Date.now() + 30*86400000).toISOString().slice(0,10), discount: 0, addition: 0, observations: '', items: [] })
      onSaved()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const allServices = svcData?.flatMap ? svcData.flatMap((cat:any) => cat.services) : []
  
  const onServicePick = (sid: string) => {
    const svc = allServices.find((s:any) => s.id === sid)
    if (svc) addItem(svc)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto scroll-thin pr-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={clientOpen} className="w-full justify-between font-normal">
                    {form.clientId ? (clientsData?.clients ?? []).find((c:any) => c.id === form.clientId)?.name : "Selecione o cliente"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {(clientsData?.clients ?? []).map((c:any) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => { setForm({...form, clientId: c.id}); setClientOpen(false) }}>
                            <Check className={cn("mr-2 h-4 w-4", form.clientId === c.id ? "opacity-100" : "opacity-0")} />
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={form.professionalId} onValueChange={(v) => setForm({...form, professionalId: v})}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{(profData?.professionals ?? []).map((p:any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Válido até</Label><Input type="date" value={form.validUntil} onChange={(e) => setForm({...form, validUntil: e.target.value})} /></div>
            <div className="space-y-1.5"><Label>Adicionar serviço</Label>
              <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={serviceOpen} className="w-full justify-between font-normal">
                    + serviço
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar serviço..." />
                    <CommandList>
                      <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                      <CommandGroup>
                        {allServices.map((s:any) => (
                          <CommandItem key={s.id} value={s.name} onSelect={() => { onServicePick(s.id); setServiceOpen(false) }}>
                            {s.name} — {formatCurrency(s.price)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Itens</Label>
            {form.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Adicione serviços ou crie um item personalizado</p>}
            {form.items.map((it: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={it.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="flex-1" />
                <Input type="number" value={it.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value))} className="w-20" />
                <Input type="number" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value))} className="w-24" />
                <span className="w-24 text-right text-sm font-medium">{formatCurrency(it.total)}</span>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => addItem()}><Plus className="w-3 h-3 mr-1" /> Item personalizado</Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Desconto</Label><Input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({...form, discount: parseFloat(e.target.value) || 0})} /></div>
            <div className="space-y-1.5"><Label>Acréscimo</Label><Input type="number" step="0.01" value={form.addition} onChange={(e) => setForm({...form, addition: parseFloat(e.target.value) || 0})} /></div>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">{formatCurrency(total)}</span>
          </div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} value={form.observations} onChange={(e) => setForm({...form, observations: e.target.value})} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
