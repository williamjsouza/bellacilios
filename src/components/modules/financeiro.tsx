'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Plus, Trash2, CheckCircle2,
  Receipt, CreditCard, Banknote, PiggyBank, TrendingUp, TrendingDown,
  LayoutGrid, HandCoins, Calculator,
} from 'lucide-react'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { formatCurrency, formatDate, formatDateTime, formatTime } from '@/lib/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

// ---------- shared constants & helpers ----------
const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'credito', label: 'Cartão crédito' },
  { value: 'debito', label: 'Cartão débito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outro', label: 'Outro' },
]

const PAYABLE_CATEGORIES = [
  'aluguel', 'energia', 'internet', 'produtos', 'salarios', 'comissões',
  'marketing', 'impostos', 'equipamentos', 'manutenção', 'outros',
]

function methodLabel(m?: string) {
  return PAYMENT_METHODS.find((x) => x.value === m)?.label || (m || '—')
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paga' || status === 'pago')
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paga</Badge>
  if (status === 'vencida')
    return <Badge className="bg-red-100 text-red-700 border-red-200">Vencida</Badge>
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Aberta</Badge>
}

function SkeletonTable() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

// ====================================================================
// CAIXA TAB
// ====================================================================
function CaixaTab() {
  const { toast } = useToast()
  const { data, loading, reload } = useFetch<any>('/api/finance/cash')
  const [openDlg, setOpenDlg] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [mvDlg, setMvDlg] = useState<null | 'suprimento' | 'sangria' | 'avulsa'>(null)
  const [closeDlg, setCloseDlg] = useState(false)
  const [busy, setBusy] = useState(false)

  // movement form state
  const [mvType, setMvType] = useState<'entrada' | 'saida'>('entrada')
  const [mvMethod, setMvMethod] = useState('dinheiro')
  const [mvAmount, setMvAmount] = useState('')
  const [mvDesc, setMvDesc] = useState('')

  // close form
  const [cntDinheiro, setCntDinheiro] = useState('')
  const [cntPix, setCntPix] = useState('')
  const [cntCartao, setCntCartao] = useState('')
  const [closeNotes, setCloseNotes] = useState('')

  const cash = data?.cash
  const movements = data?.movements || []
  const totals = data?.totals
  const balance = data?.balance ?? 0
  const totalEntrada = data?.totalEntrada ?? 0
  const totalSaida = data?.totalSaida ?? 0

  async function openCash() {
    setBusy(true)
    try {
      await apiPost('/api/finance/cash', { openingAmount: Number(openingAmount) || 0 })
      toast({ title: 'Caixa aberto', description: `Valor inicial: ${formatCurrency(Number(openingAmount) || 0)}` })
      setOpenDlg(false)
      setOpeningAmount('')
      reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  async function addMovement() {
    if (!cash) return
    setBusy(true)
    try {
      const amt = Number(mvAmount)
      if (!amt || amt <= 0) throw new Error('Valor inválido')
      let type = mvType
      if (mvDlg === 'suprimento') type = 'suprimento'
      else if (mvDlg === 'sangria') type = 'sangria'
      await apiPost('/api/finance/cash', {
        cashId: cash.id,
        type,
        amount: amt,
        method: mvMethod,
        description: mvDesc,
      })
      toast({ title: 'Movimento registrado' })
      setMvDlg(null)
      setMvAmount(''); setMvDesc(''); setMvMethod('dinheiro'); setMvType('entrada')
      reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const expectedDinheiro = totals?.dinheiro?.saldo ?? 0
  const expectedPix = totals?.pix?.saldo ?? 0
  const expectedCartao = (totals?.cartao?.saldo ?? 0) + (totals?.credito?.saldo ?? 0) + (totals?.debito?.saldo ?? 0)
  const expectedTotal = expectedDinheiro + expectedPix + expectedCartao
  const countedTotal = (Number(cntDinheiro) || 0) + (Number(cntPix) || 0) + (Number(cntCartao) || 0)
  const diff = countedTotal - expectedTotal

  async function closeCash() {
    if (!cash) return
    setBusy(true)
    try {
      await apiPost(`/api/finance/cash/${cash.id}/close`, {
        countedAmounts: {
          dinheiro: Number(cntDinheiro) || 0,
          pix: Number(cntPix) || 0,
          cartao: Number(cntCartao) || 0,
        },
        notes: closeNotes,
      })
      toast({
        title: 'Caixa fechado',
        description: `Diferença: ${formatCurrency(diff)}`,
        variant: Math.abs(diff) < 0.01 ? 'default' : 'destructive',
      })
      setCloseDlg(false)
      setCntDinheiro(''); setCntPix(''); setCntCartao(''); setCloseNotes('')
      reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  if (loading) return <SkeletonTable />

  if (!cash) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto size-14 rounded-full bg-muted flex items-center justify-center">
            <Wallet className="size-7 text-muted-foreground" />
          </div>
          <CardTitle className="mt-2">Caixa fechado</CardTitle>
          <CardDescription>Não há caixa aberto no momento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={openDlg} onOpenChange={setOpenDlg}>
            <DialogTrigger asChild>
              <Button className="w-full"><Calculator className="size-4 mr-2" /> Abrir caixa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir caixa</DialogTitle>
                <DialogDescription>Informe o valor inicial em dinheiro.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Valor de abertura (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDlg(false)}>Cancelar</Button>
                <Button onClick={openCash} disabled={busy}>Abrir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-5 text-emerald-600" /> Caixa aberto
              </CardTitle>
              <CardDescription>
                Aberto em {formatDateTime(cash.openedAt)} por {cash.createdBy || '—'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { setMvType('entrada'); setMvDlg('suprimento') }}>
                <ArrowDownCircle className="size-4 mr-1 text-emerald-600" /> Suprimento
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setMvType('saida'); setMvDlg('sangria') }}>
                <ArrowUpCircle className="size-4 mr-1 text-red-600" /> Sangria
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setMvType('entrada'); setMvDlg('avulsa') }}>
                <Plus className="size-4 mr-1" /> Movimento avulso
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setCloseDlg(true)}>
                Fechar caixa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Abertura</div>
              <div className="text-lg font-semibold">{formatCurrency(cash.openingAmount)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Entradas</div>
              <div className="text-lg font-semibold text-emerald-600">{formatCurrency(totalEntrada)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Saídas</div>
              <div className="text-lg font-semibold text-red-600">{formatCurrency(totalSaida)}</div>
            </div>
            <div className="rounded-lg border p-3 bg-primary/5">
              <div className="text-xs text-muted-foreground">Saldo atual</div>
              <div className="text-lg font-bold">{formatCurrency(balance)}</div>
            </div>
          </div>

          {/* totals by method */}
          {totals && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {['dinheiro', 'pix', 'cartao', 'credito', 'debito', 'transferencia', 'boleto', 'outro']
                .filter((m) => totals[m] && (totals[m].entrada || totals[m].saida))
                .map((m) => (
                  <div key={m} className="rounded-md bg-muted/50 p-2 text-sm">
                    <div className="text-xs text-muted-foreground capitalize">{methodLabel(m)}</div>
                    <div className="font-medium">{formatCurrency(totals[m].saldo)}</div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movements list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movimentos do caixa</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum movimento registrado.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto scroll-thin -mx-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...movements].reverse().map((mv: any) => {
                    const positive = mv.type === 'entrada' || mv.type === 'suprimento'
                    return (
                      <TableRow key={mv.id}>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(mv.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={positive ? 'text-emerald-700 border-emerald-300' : 'text-red-700 border-red-300'}>
                            {mv.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{methodLabel(mv.method)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{mv.description || '—'}</TableCell>
                        <TableCell className={`text-right font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {positive ? '+' : '−'} {formatCurrency(mv.amount)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movement dialog (suprimento/sangria/avulsa) */}
      <Dialog open={!!mvDlg} onOpenChange={(o) => !o && setMvDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mvDlg === 'suprimento' && 'Suprimento (entrada de caixa)'}
              {mvDlg === 'sangria' && 'Sangria (saída de caixa)'}
              {mvDlg === 'avulsa' && 'Movimento avulso'}
            </DialogTitle>
            <DialogDescription>Registre um movimento no caixa atual.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {mvDlg === 'avulsa' && (
              <div>
                <Label>Tipo</Label>
                <Select value={mvType} onValueChange={(v) => setMvType(v as any)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={mvAmount} onChange={(e) => setMvAmount(e.target.value)} />
              </div>
              <div>
                <Label>Método</Label>
                <Select value={mvMethod} onValueChange={setMvMethod}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={mvDesc} onChange={(e) => setMvDesc(e.target.value)} placeholder="Observação opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMvDlg(null)}>Cancelar</Button>
            <Button onClick={addMovement} disabled={busy}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close dialog */}
      <Dialog open={closeDlg} onOpenChange={setCloseDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechamento de caixa</DialogTitle>
            <DialogDescription>Confira os valores contados por método.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="rounded-md border p-3 space-y-2 text-sm bg-muted/40">
              <div className="flex justify-between"><span className="text-muted-foreground">Esperado dinheiro</span><span className="font-medium">{formatCurrency(expectedDinheiro)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Esperado PIX</span><span className="font-medium">{formatCurrency(expectedPix)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Esperado cartão</span><span className="font-medium">{formatCurrency(expectedCartao)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Total esperado</span><span className="font-bold">{formatCurrency(expectedTotal)}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Contado dinheiro</Label>
                <Input type="number" step="0.01" min="0" value={cntDinheiro} onChange={(e) => setCntDinheiro(e.target.value)} />
              </div>
              <div>
                <Label>Contado PIX</Label>
                <Input type="number" step="0.01" min="0" value={cntPix} onChange={(e) => setCntPix(e.target.value)} />
              </div>
              <div>
                <Label>Contado cartão</Label>
                <Input type="number" step="0.01" min="0" value={cntCartao} onChange={(e) => setCntCartao(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between items-center rounded-md border p-3">
              <span className="text-sm">Total contado</span>
              <span className="font-semibold">{formatCurrency(countedTotal)}</span>
            </div>
            <div className={`flex justify-between items-center rounded-md border p-3 ${Math.abs(diff) < 0.01 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span className="text-sm font-medium">Diferença</span>
              <span className={`font-bold ${Math.abs(diff) < 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(diff)}</span>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea rows={2} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Notas do fechamento" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDlg(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={closeCash} disabled={busy}>Confirmar fechamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================================================================
// CONTAS A RECEBER TAB
// ====================================================================
function ReceberTab() {
  const { toast } = useToast()
  const [filter, setFilter] = useState('all')
  const { data, loading, reload } = useFetch<any>(`/api/finance/receivable?status=${filter}`, [filter])
  const { data: clientsData } = useFetch<any>('/api/clients')
  const [newDlg, setNewDlg] = useState(false)
  const [payDlg, setPayDlg] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState('pix')
  const [busy, setBusy] = useState(false)

  // form
  const [fDesc, setFDesc] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fDue, setFDue] = useState('')
  const [fClient, setFClient] = useState('')

  const items = data?.items || []
  const totalOpen = data?.totalOpen ?? 0

  async function create() {
    setBusy(true)
    try {
      if (!fDesc || !fAmount || !fDue) throw new Error('Preencha os campos obrigatórios')
      await apiPost('/api/finance/receivable', {
        description: fDesc, amount: Number(fAmount), dueDate: fDue,
        clientId: fClient || undefined,
      })
      toast({ title: 'Conta criada' })
      setNewDlg(false); setFDesc(''); setFAmount(''); setFDue(''); setFClient('')
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  async function markPaid() {
    if (!payDlg) return
    setBusy(true)
    try {
      await apiPost(`/api/finance/receivable/${payDlg}`, { method: payMethod }, 'PUT')
      toast({ title: 'Conta recebida' })
      setPayDlg(null)
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta conta?')) return
    try {
      await apiPost(`/api/finance/receivable/${id}`, {}, 'DELETE')
      toast({ title: 'Conta excluída' })
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="aberta">Abertas</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
              <SelectItem value="paga">Pagas</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            A receber: <span className="font-semibold text-foreground">{formatCurrency(totalOpen)}</span>
          </div>
        </div>
        <Button onClick={() => setNewDlg(true)}><Plus className="size-4 mr-1" /> Nova conta</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><SkeletonTable /></div> : items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Nenhuma conta encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.client?.name || '—'}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{it.description}</TableCell>
                      <TableCell>{formatDate(it.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(it.amount)}</TableCell>
                      <TableCell><StatusBadge status={it.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{it.paidAt ? formatDate(it.paidAt) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {it.status !== 'paga' && (
                            <Button size="sm" variant="outline" onClick={() => { setPayDlg(it.id); setPayMethod('pix') }}>
                              <CheckCircle2 className="size-4 mr-1 text-emerald-600" /> Receber
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New receivable */}
      <Dialog open={newDlg} onOpenChange={setNewDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta a receber</DialogTitle>
            <DialogDescription>Registre um valor a receber.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>Descrição *</Label>
              <Input value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Ex: Pacote mensal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={fAmount} onChange={(e) => setFAmount(e.target.value)} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={fDue} onChange={(e) => setFDue(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={fClient} onValueChange={setFClient}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(clientsData?.clients || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDlg(false)}>Cancelar</Button>
            <Button onClick={create} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!payDlg} onOpenChange={(o) => !o && setPayDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber conta</DialogTitle>
            <DialogDescription>Selecione a forma de recebimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label>Forma de pagamento</Label>
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDlg(null)}>Cancelar</Button>
            <Button onClick={markPaid} disabled={busy}><CheckCircle2 className="size-4 mr-1" /> Confirmar recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================================================================
// CONTAS A PAGAR TAB
// ====================================================================
function PagarTab() {
  const { toast } = useToast()
  const [filter, setFilter] = useState('all')
  const { data, loading, reload } = useFetch<any>(`/api/finance/payable?status=${filter}`, [filter])
  const { data: supData } = useFetch<any>('/api/suppliers')
  const [newDlg, setNewDlg] = useState(false)
  const [payDlg, setPayDlg] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState('pix')
  const [busy, setBusy] = useState(false)

  const [fDesc, setFDesc] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fDue, setFDue] = useState('')
  const [fCat, setFCat] = useState('aluguel')
  const [fSup, setFSup] = useState('')
  const [fCenter, setFCenter] = useState('')

  const items = data?.items || []
  const totalOpen = data?.totalOpen ?? 0

  async function create() {
    setBusy(true)
    try {
      if (!fDesc || !fAmount || !fDue || !fCat) throw new Error('Preencha os campos obrigatórios')
      await apiPost('/api/finance/payable', {
        description: fDesc, amount: Number(fAmount), dueDate: fDue, category: fCat,
        supplierId: fSup || undefined, costCenter: fCenter || undefined,
      })
      toast({ title: 'Despesa criada' })
      setNewDlg(false); setFDesc(''); setFAmount(''); setFDue(''); setFCat('aluguel'); setFSup(''); setFCenter('')
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  async function markPaid() {
    if (!payDlg) return
    setBusy(true)
    try {
      await apiPost(`/api/finance/payable/${payDlg}`, { method: payMethod }, 'PUT')
      toast({ title: 'Despesa paga' })
      setPayDlg(null)
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta despesa?')) return
    try {
      await apiPost(`/api/finance/payable/${id}`, {}, 'DELETE')
      toast({ title: 'Despesa excluída' })
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="aberta">Abertas</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
              <SelectItem value="paga">Pagas</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            A pagar: <span className="font-semibold text-foreground">{formatCurrency(totalOpen)}</span>
          </div>
        </div>
        <Button onClick={() => setNewDlg(true)}><Plus className="size-4 mr-1" /> Nova despesa</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><SkeletonTable /></div> : items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Nenhuma despesa encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium max-w-[220px] truncate">{it.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{it.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{it.supplier?.tradeName || it.supplier?.companyName || '—'}</TableCell>
                      <TableCell>{formatDate(it.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(it.amount)}</TableCell>
                      <TableCell><StatusBadge status={it.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {it.status !== 'paga' && (
                            <Button size="sm" variant="outline" onClick={() => { setPayDlg(it.id); setPayMethod('pix') }}>
                              <CheckCircle2 className="size-4 mr-1 text-emerald-600" /> Pagar
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New payable */}
      <Dialog open={newDlg} onOpenChange={setNewDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova despesa</DialogTitle>
            <DialogDescription>Registre uma conta a pagar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>Descrição *</Label>
              <Input value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Ex: Aluguel do mês" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={fAmount} onChange={(e) => setFAmount(e.target.value)} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={fDue} onChange={(e) => setFDue(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Select value={fCat} onValueChange={setFCat}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro de custo</Label>
                <Input value={fCenter} onChange={(e) => setFCenter(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div>
              <Label>Fornecedor (opcional)</Label>
              <Select value={fSup} onValueChange={setFSup}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(supData?.suppliers || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.tradeName || s.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDlg(false)}>Cancelar</Button>
            <Button onClick={create} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!payDlg} onOpenChange={(o) => !o && setPayDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar despesa</DialogTitle>
            <DialogDescription>Selecione a forma de pagamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label>Forma de pagamento</Label>
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDlg(null)}>Cancelar</Button>
            <Button onClick={markPaid} disabled={busy}><CheckCircle2 className="size-4 mr-1" /> Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================================================================
// COMISSÕES TAB
// ====================================================================
function ComissoesTab() {
  const { toast } = useToast()
  const [filter, setFilter] = useState('aberta')
  const { data, loading, reload } = useFetch<any>(`/api/finance/commissions?status=${filter}`, [filter])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const items = data?.items || []
  const totalToPay = data?.totalToPay ?? 0

  // group by professional
  const grouped = useMemo(() => {
    const map: Record<string, { name: string; color: string; items: any[]; subtotal: number }> = {}
    for (const it of items) {
      const key = it.professionalId
      if (!map[key]) map[key] = { name: it.professional?.name || '—', color: it.professional?.color || '#888', items: [], subtotal: 0 }
      map[key].items.push(it)
      if (it.status === 'aberta') map[key].subtotal += it.amount
    }
    return Object.values(map)
  }, [items])

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function toggleAll(ids: string[]) {
    setSelected((s) => {
      const n = new Set(s)
      const allSelected = ids.every((id) => n.has(id))
      if (allSelected) ids.forEach((id) => n.delete(id))
      else ids.forEach((id) => n.add(id))
      return n
    })
  }

  async function paySelected() {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const res = await apiPost('/api/finance/commissions', { ids: Array.from(selected) })
      toast({ title: 'Comissões pagas', description: `${res.updated} comissão(ões) marcadas como pagas` })
      setSelected(new Set())
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  const selectedTotal = items
    .filter((i: any) => selected.has(i.id))
    .reduce((s: number, i: any) => s + i.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => { setFilter(v); setSelected(new Set()) }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="aberta">Em aberto</SelectItem>
              <SelectItem value="paga">Pagas</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            Total a pagar: <span className="font-semibold text-foreground">{formatCurrency(totalToPay)}</span>
          </div>
        </div>
        {filter !== 'paga' && (
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <span className="text-sm text-muted-foreground">
                Selecionado: <span className="font-semibold text-foreground">{formatCurrency(selectedTotal)}</span>
              </span>
            )}
            <Button onClick={paySelected} disabled={selected.size === 0 || busy}>
              <HandCoins className="size-4 mr-1" /> Pagar selecionadas ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {loading ? <SkeletonTable /> : grouped.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma comissão encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => {
            const openIds = g.items.filter((i) => i.status === 'aberta').map((i) => i.id)
            const allSelected = openIds.length > 0 && openIds.every((id) => selected.has(id))
            return (
              <Card key={g.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ background: g.color }} />
                      <CardTitle className="text-base">{g.name}</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Subtotal a pagar: <span className="font-semibold text-foreground">{formatCurrency(g.subtotal)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {filter !== 'paga' && (
                            <TableHead className="w-10">
                              <Checkbox checked={allSelected} onCheckedChange={() => toggleAll(openIds)} />
                            </TableHead>
                          )}
                          <TableHead>Procedimento / Venda</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">%</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pago em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.items.map((it: any) => (
                          <TableRow key={it.id}>
                            {filter !== 'paga' && (
                              <TableCell>
                                {it.status === 'aberta' && (
                                  <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} />
                                )}
                              </TableCell>
                            )}
                            <TableCell className="max-w-[260px] truncate">
                              {it.procedure
                                ? `${it.procedure.service?.name || 'Procedimento'} — ${it.procedure.client?.name || ''}`
                                : it.sale
                                  ? `Venda — ${it.sale.client?.name || ''}`
                                  : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(it.createdAt)}</TableCell>
                            <TableCell className="text-right">{it.percentage}%</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(it.amount)}</TableCell>
                            <TableCell>
                              {it.status === 'paga'
                                ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paga</Badge>
                                : <Badge className="bg-amber-100 text-amber-800 border-amber-200">Aberta</Badge>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{it.paidAt ? formatDate(it.paidAt) : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ====================================================================
// RESUMO TAB
// ====================================================================
const PIE_COLORS = ['#d63384', '#e85d75', '#f59e0b', '#10b981', '#8b5cf6', '#a855f7', '#ec4899', '#84cc16', '#f97316', '#c026d3', '#64748b']

function ResumoTab() {
  const { data, loading } = useFetch<any>('/api/finance/summary')

  if (loading || !data) return <SkeletonTable />

  const { receitas, despesas, lucro, days, expensesByCategory } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas (mês)</CardTitle>
            <TrendingUp className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(receitas)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de entradas no mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas (mês)</CardTitle>
            <TrendingDown className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(despesas)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de saídas no mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro líquido</CardTitle>
            <PiggyBank className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(lucro)}</div>
            <p className="text-xs text-muted-foreground mt-1">Receitas − Despesas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><LayoutGrid className="size-4" /> Fluxo de caixa (7 dias)</CardTitle>
            <CardDescription>Entradas vs saídas dos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(Number(v))}
                    contentStyle={{ borderRadius: 8, border: '1px solid #eee', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="size-4" /> Despesas por categoria (mês)</CardTitle>
            <CardDescription>Distribuição das contas pagas no mês</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground h-72 flex items-center justify-center">Nenhuma despesa paga no mês.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={90}
                      label={(e: any) => `${e.name}`}
                      labelLine={false}
                    >
                      {expensesByCategory.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #eee', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ====================================================================
// MAIN MODULE
// ====================================================================
export default function FinanceiroModule() {
  const [tab, setTab] = useState('caixa')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="size-6 text-primary" /> Financeiro
        </h1>
        <p className="text-sm text-muted-foreground">Caixa, contas a receber/pagar, comissões e resumo financeiro.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap">
          <TabsTrigger value="caixa" className="gap-1.5"><Banknote className="size-4" /> Caixa</TabsTrigger>
          <TabsTrigger value="receber" className="gap-1.5"><ArrowDownCircle className="size-4" /> Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar" className="gap-1.5"><ArrowUpCircle className="size-4" /> Contas a Pagar</TabsTrigger>
          <TabsTrigger value="comissoes" className="gap-1.5"><HandCoins className="size-4" /> Comissões</TabsTrigger>
          <TabsTrigger value="resumo" className="gap-1.5"><CreditCard className="size-4" /> Resumo</TabsTrigger>
        </TabsList>

        <TabsContent value="caixa" className="mt-4"><CaixaTab /></TabsContent>
        <TabsContent value="receber" className="mt-4"><ReceberTab /></TabsContent>
        <TabsContent value="pagar" className="mt-4"><PagarTab /></TabsContent>
        <TabsContent value="comissoes" className="mt-4"><ComissoesTab /></TabsContent>
        <TabsContent value="resumo" className="mt-4"><ResumoTab /></TabsContent>
      </Tabs>
    </div>
  )
}
