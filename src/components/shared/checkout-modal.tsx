'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/format'
import { apiPost } from '@/lib/use-fetch'
import { Plus, Trash2, DollarSign, CreditCard, Wallet, Banknote, CheckCircle2, Loader2, Search } from 'lucide-react'

const METHODS = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: DollarSign },
  { value: 'credito', label: 'Cartão Crédito', icon: CreditCard },
  { value: 'debito', label: 'Cartão Débito', icon: CreditCard },
  { value: 'transferencia', label: 'Transferência', icon: Wallet },
]

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  clientId: string
  clientName: string
  /** Se vier de um procedimento já finalizado, pode receber a saleId pré-carregada */
  initialSaleId?: string
  onPaid?: () => void
}

export default function CheckoutModal({ open, onOpenChange, clientId, clientName, initialSaleId, onPaid }: CheckoutModalProps) {
  const { toast } = useToast()

  const [sale, setSale] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paid, setPaid] = useState(false)

  // Para adicionar serviço avulso
  const [services, setServices] = useState<any[]>([])
  const [searchSvc, setSearchSvc] = useState('')
  const [showSvcPicker, setShowSvcPicker] = useState(false)

  // Pagamento multi-método
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([{ method: 'pix', amount: 0 }])
  const [discount, setDiscount] = useState(0)

  // Carregar/abrir venda ao abrir modal
  useEffect(() => {
    if (!open) { setSale(null); setPaid(false); return }
    load()
    fetchServices()
  }, [open, clientId])

  // Sincronizar pagamento com total quando sale muda
  useEffect(() => {
    if (sale) {
      const total = Math.max(0, sale.subtotal - discount)
      setPayments([{ method: 'pix', amount: total }])
    }
  }, [sale?.subtotal, discount])

  const load = async () => {
    setLoading(true)
    try {
      if (initialSaleId) {
        // Temos o saleId exato (vindo do atendimento) — carrega diretamente
        const res = await fetch(`/api/checkout?saleId=${initialSaleId}`)
        const data = await res.json()
        if (data.sale) {
          setSale(data.sale)
          setDiscount(data.sale.discount ?? 0)
          return
        }
      }
      // Busca sale aberta ou cria automaticamente a partir dos agendamentos do dia
      const res = await fetch(`/api/checkout?clientId=${clientId}`)
      const data = await res.json()
      if (data.sale) {
        setSale(data.sale)
        setDiscount(data.sale.discount ?? 0)
      }
      // Se não há sale (nem agendamentos hoje), o modal abre em branco para cobrança avulsa
    } catch (e: any) {
      toast({ title: 'Erro ao carregar checkout', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    const res = await fetch('/api/services')
    const data = await res.json()
    // A rota retorna array de categorias com services dentro
    const all = Array.isArray(data) ? data.flatMap((c: any) => c.services ?? []) : []
    setServices(all)
  }

  const addService = async (svc: any) => {
    if (!sale) return
    setSaving(true)
    try {
      const r = await apiPost('/api/checkout', {
        action: 'add-item',
        saleId: sale.id,
        item: { serviceId: svc.id, description: svc.name, quantity: 1, unitPrice: svc.price, total: svc.price },
      })
      setSale(r.sale)
      setShowSvcPicker(false)
      setSearchSvc('')
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async (itemId: string) => {
    if (!sale) return
    setSaving(true)
    try {
      const r = await apiPost('/api/checkout', { action: 'remove-item', saleId: sale.id, item: { id: itemId } })
      setSale(r.sale)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const applyDiscount = async (val: number) => {
    if (!sale) return
    setDiscount(val)
    try {
      const r = await apiPost('/api/checkout', { action: 'set-discount', saleId: sale.id, discount: val })
      setSale(r.sale)
    } catch { }
  }

  const pay = async () => {
    if (!sale) return
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    const totalDue = Math.max(0, (sale.subtotal ?? 0) - discount)
    if (Math.abs(totalPaid - totalDue) > 0.01) {
      toast({ title: 'Valor divergente', description: `Soma dos pagamentos (${formatCurrency(totalPaid)}) ≠ Total (${formatCurrency(totalDue)})`, variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await apiPost('/api/checkout', { action: 'pay', saleId: sale.id, payments, discount })
      setPaid(true)
      toast({ title: '✅ Pagamento registrado!', description: `${formatCurrency(totalDue)} recebido de ${clientName}` })
      onPaid?.()
    } catch (e: any) {
      toast({ title: 'Erro ao processar pagamento', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addPaymentMethod = () => setPayments(p => [...p, { method: 'dinheiro', amount: 0 }])
  const updatePayment = (i: number, k: 'method' | 'amount', v: any) =>
    setPayments(p => p.map((pm, idx) => idx === i ? { ...pm, [k]: v } : pm))
  const removePayment = (i: number) => setPayments(p => p.filter((_, idx) => idx !== i))

  const subtotal = sale?.subtotal ?? 0
  const total = Math.max(0, subtotal - discount)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = total - totalPaid

  const filteredSvcs = useMemo(() =>
    services.filter(s => s.name.toLowerCase().includes(searchSvc.toLowerCase())).slice(0, 15),
    [services, searchSvc]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Checkout — {clientName}
          </DialogTitle>
          <DialogDescription>
            Revisar itens, adicionar serviços e processar pagamento
          </DialogDescription>
        </DialogHeader>

        {paid ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 gap-4 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <h3 className="text-xl font-bold">Pagamento registrado!</h3>
            <p className="text-muted-foreground">O histórico financeiro e a ficha da cliente foram atualizados.</p>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center p-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 py-4">
              {/* Itens da venda */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Serviços / Produtos</span>
                  <Button size="sm" variant="outline" onClick={() => setShowSvcPicker(v => !v)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>

                {/* Picker de serviços */}
                {showSvcPicker && (
                  <div className="mb-3 border rounded-lg p-3 bg-muted/50 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Buscar serviço..."
                        value={searchSvc}
                        onChange={e => setSearchSvc(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {filteredSvcs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">Nenhum serviço encontrado</p>
                      ) : filteredSvcs.map((svc: any) => (
                        <button
                          key={svc.id}
                          onClick={() => addService(svc)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent text-sm text-left"
                        >
                          <span>{svc.name}</span>
                          <Badge variant="secondary">{formatCurrency(svc.price)}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de itens */}
                {!sale?.items?.length ? (
                  <div className="border-2 border-dashed rounded-lg py-8 text-center text-muted-foreground text-sm">
                    Nenhum item. Adicione um serviço ou produto.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sale.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.description}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <span className="font-semibold text-sm shrink-0">{formatCurrency(item.total)}</span>
                        <Button
                          size="icon" variant="ghost"
                          className="text-destructive h-7 w-7 shrink-0"
                          onClick={() => removeItem(item.id)}
                          disabled={saving}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Desconto */}
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-sm w-24 shrink-0">Desconto (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={discount}
                  onChange={e => applyDiscount(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                <div className="flex-1 text-right">
                  <p className="text-xs text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</p>
                  <p className="text-lg font-bold text-emerald-600">Total: {formatCurrency(total)}</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Pagamentos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Forma de pagamento</span>
                  <Button size="sm" variant="ghost" onClick={addPaymentMethod}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Dividir
                  </Button>
                </div>
                {payments.map((pm, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={pm.method} onValueChange={v => updatePayment(i, 'method', v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" step="0.01" min={0}
                      value={pm.amount}
                      onChange={e => updatePayment(i, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                    {payments.length > 1 && (
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removePayment(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Status do troco / diferença */}
                {Math.abs(remaining) > 0.01 && (
                  <div className={`text-sm text-right font-medium mt-1 ${remaining > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {remaining > 0 ? `Falta: ${formatCurrency(remaining)}` : `Troco: ${formatCurrency(-remaining)}`}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button
                onClick={pay}
                disabled={saving || !sale?.items?.length}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-36"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Cobrar {formatCurrency(total)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
