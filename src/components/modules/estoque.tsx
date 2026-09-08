'use client'

import { useMemo, useState } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import {
  Boxes, Package, ArrowLeftRight, Truck, Tags, Plus, Search, Edit2, Trash2,
  AlertTriangle, TrendingUp, TrendingDown, Settings2, Loader2, Save, X, Phone,
  Mail, MapPin, User, MessageCircle, Layers, DollarSign,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ---------- tipos / constantes ----------
const MOVEMENT_TYPES = [
  { value: 'entrada', label: 'Entrada', sign: '+', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'suprimento', label: 'Suprimento', sign: '+', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'saida', label: 'Saída', sign: '-', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  { value: 'ajuste', label: 'Ajuste', sign: '=', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'perda', label: 'Perda', sign: '-', color: 'text-destructive', bg: 'bg-destructive/10' },
  { value: 'vencimento', label: 'Vencimento', sign: '-', color: 'text-destructive', bg: 'bg-destructive/10' },
  { value: 'consumo', label: 'Consumo', sign: '-', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
]
const typeMeta = (t: string) => MOVEMENT_TYPES.find((m) => m.value === t) || { label: t, sign: '', color: '', bg: '' }

const UNITS = ['un', 'ml', 'g', 'kg', 'par', 'metro', 'pacote', 'cx']

const emptyProduct = {
  id: '', name: '', code: '', barcode: '', categoryId: '', supplierId: '',
  brand: '', unit: 'un', lot: '', expiryDate: '', cost: 0, price: 0,
  stock: 0, minStock: 0, active: true,
}

// ============================================================
// MAIN MODULE
// ============================================================
export default function EstoqueModule() {
  const [tab, setTab] = useState('produtos')

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary" />
            Estoque
          </h2>
          <p className="text-sm text-muted-foreground">
            Controle de produtos, movimentações, fornecedores e categorias.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="produtos" className="flex-1 sm:flex-none"><Package className="w-4 h-4 mr-1.5" />Produtos</TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex-1 sm:flex-none"><ArrowLeftRight className="w-4 h-4 mr-1.5" />Movimentações</TabsTrigger>
          <TabsTrigger value="fornecedores" className="flex-1 sm:flex-none"><Truck className="w-4 h-4 mr-1.5" />Fornecedores</TabsTrigger>
          <TabsTrigger value="categorias" className="flex-1 sm:flex-none"><Tags className="w-4 h-4 mr-1.5" />Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos"><ProductsTab /></TabsContent>
        <TabsContent value="movimentacoes"><MovementsTab /></TabsContent>
        <TabsContent value="fornecedores"><SuppliersTab /></TabsContent>
        <TabsContent value="categorias"><CategoriesTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// TAB: PRODUTOS
// ============================================================
function ProductsTab() {
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [movementOpen, setMovementOpen] = useState(false)
  const [movementProduct, setMovementProduct] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { data, loading, reload } = useFetch(
    `/api/products?q=${encodeURIComponent(q)}&categoryId=${categoryId}`,
    [q, categoryId],
  )
  const cats = useFetch('/api/products/categories', [])
  const sups = useFetch('/api/suppliers', [])

  const products: any[] = data?.products ?? []
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= p.minStock).length,
    [products],
  )

  const handleSave = async (form: any) => {
    setSaving(true)
    try {
      await apiPost('/api/products', form)
      toast({ title: editing ? 'Produto atualizado' : 'Produto criado' })
      setFormOpen(false)
      setEditing(null)
      reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      await apiPost(`/api/products/${deleteId}`, {}, 'DELETE')
      toast({ title: 'Produto excluído' })
      setDeleteId(null)
      reload()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total de itens" value={products.length} icon={<Package className="w-4 h-4" />} />
        <KpiCard label="Estoque baixo" value={lowStockCount} icon={<AlertTriangle className="w-4 h-4" />} tone="warn" />
        <KpiCard
          label="Valor em estoque"
          value={formatCurrency(products.reduce((s, p) => s + (p.cost || 0) * (p.stock || 0), 0))}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KpiCard
          label="Fornecedores"
          value={sups.data?.suppliers?.length ?? 0}
          icon={<Truck className="w-4 h-4" />}
        />
      </div>

      {/* filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, código, marca, código de barras…"
            className="pl-9"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {(cats.data?.categories ?? []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Novo produto
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="Nenhum produto encontrado"
              hint="Cadastre um novo produto ou ajuste os filtros."
            />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Min.</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const low = p.stock <= p.minStock
                    const expiringSoon = p.expiryDate
                      ? (new Date(p.expiryDate).getTime() - Date.now()) / 86400000 < 30
                      : false
                    return (
                      <TableRow key={p.id} className={low ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium flex items-center gap-1.5">
                              {!p.active && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
                              {p.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {[p.code, p.brand, p.unit && `${p.unit}`].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.category ? <Badge variant="secondary" className="font-normal">{p.category.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{p.supplier?.tradeName || p.supplier?.companyName || '—'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <span className={`font-semibold ${low ? 'text-amber-600 dark:text-amber-400' : ''}`}>{p.stock}</span>
                            {low && (
                              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30">
                                baixo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.minStock}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.price)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{p.lot || '—'}</span>
                        </TableCell>
                        <TableCell>
                          {p.expiryDate ? (
                            <span className={`text-xs ${expiringSoon ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>
                              {formatDate(p.expiryDate)}
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm" variant="ghost" title="Movimentar estoque"
                              onClick={() => { setMovementProduct(p); setMovementOpen(true) }}
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm" variant="ghost" title="Editar"
                              onClick={() => { setEditing(p); setFormOpen(true) }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm" variant="ghost" title="Excluir"
                              onClick={() => setDeleteId(p.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        categories={cats.data?.categories ?? []}
        suppliers={sups.data?.suppliers ?? []}
        saving={saving}
        onSave={handleSave}
      />

      <MovementFormDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        product={movementProduct}
        products={products}
        onSaved={() => { reload(); setMovementOpen(false); setMovementProduct(null) }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Produtos com movimentações vinculadas não podem ser excluídos — considere inativá-los.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Product Form Dialog ----------
function ProductFormDialog({
  open, onOpenChange, editing, categories, suppliers, saving, onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: any
  categories: any[]
  suppliers: any[]
  saving: boolean
  onSave: (form: any) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        {open && (
          <ProductFormInner
            key={editing?.id || 'new'}
            editing={editing}
            categories={categories}
            suppliers={suppliers}
            saving={saving}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProductFormInner({
  editing, categories, suppliers, saving, onSave,
}: {
  editing: any
  categories: any[]
  suppliers: any[]
  saving: boolean
  onSave: (form: any) => void
}) {
  const [form, setForm] = useState<any>(() =>
    editing
      ? {
          ...emptyProduct,
          ...editing,
          categoryId: editing.categoryId || '',
          supplierId: editing.supplierId || '',
          expiryDate: editing.expiryDate
            ? new Date(editing.expiryDate).toISOString().slice(0, 10)
            : '',
        }
      : emptyProduct,
  )
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          {editing ? 'Editar produto' : 'Novo produto'}
        </DialogTitle>
        <DialogDescription>
          Preencha os campos abaixo. Campos com * são obrigatórios.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome *" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Cola Lash Premium" />
          </Field>

          <Field label="Código">
            <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="SKU" />
          </Field>
          <Field label="Código de barras">
            <Input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="EAN" />
          </Field>

          <Field label="Categoria">
            <Select value={form.categoryId || 'none'} onValueChange={(v) => set('categoryId', v === 'none' ? '' : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem categoria —</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Fornecedor">
            <Select value={form.supplierId || 'none'} onValueChange={(v) => set('supplierId', v === 'none' ? '' : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem fornecedor —</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.tradeName || s.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Marca">
            <Input value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} placeholder="Ex: Bella Lash" />
          </Field>
          <Field label="Unidade">
            <Select value={form.unit} onValueChange={(v) => set('unit', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Lote">
            <Input value={form.lot || ''} onChange={(e) => set('lot', e.target.value)} placeholder="Lote atual" />
          </Field>
          <Field label="Validade">
            <Input type="date" value={form.expiryDate || ''} onChange={(e) => set('expiryDate', e.target.value)} />
          </Field>

          <Field label="Custo (R$)">
            <Input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set('cost', e.target.value)} />
          </Field>
          <Field label="Preço de venda (R$)">
            <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </Field>

          <Field label="Estoque atual">
            <Input type="number" step="0.01" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
          </Field>
          <Field label="Estoque mínimo">
            <Input type="number" step="0.01" value={form.minStock} onChange={(e) => set('minStock', e.target.value)} />
          </Field>

          <div className="sm:col-span-2 flex items-center gap-3 pt-1">
            <Switch checked={form.active} onCheckedChange={(v) => set('active', v)} id="prod-active" />
            <Label htmlFor="prod-active">Produto ativo</Label>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}><X className="w-4 h-4 mr-1" />Cancelar</Button>
          </DialogClose>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name?.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {editing ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </DialogFooter>
    </>
  )
}

// ---------- Movement Form Dialog ----------
function MovementFormDialog({
  open, onOpenChange, product, products, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  product: any
  products: any[]
  onSaved: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <MovementFormInner
            key={product?.id || 'new'}
            product={product}
            products={products}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MovementFormInner({
  product, products, onSaved,
}: {
  product: any
  products: any[]
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<any>(() => ({
    productId: product?.id || '',
    type: 'entrada',
    quantity: 1,
    reason: '',
    lot: product?.lot || '',
    expiryDate: product?.expiryDate
      ? new Date(product.expiryDate).toISOString().slice(0, 10)
      : '',
    cost: product?.cost ?? '',
  }))
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))
  const isEntrada = ['entrada', 'suprimento'].includes(form.type)
  const isAjuste = form.type === 'ajuste'

  const submit = async () => {
    if (!form.productId) { toast({ title: 'Selecione um produto', variant: 'destructive' }); return }
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' }); return
    }
    setSaving(true)
    try {
      await apiPost('/api/stock/movements', form)
      toast({ title: 'Movimentação registrada' })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const selected = products.find((p) => p.id === form.productId) || product

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          Movimentar estoque
        </DialogTitle>
        <DialogDescription>
          {selected ? `Estoque atual de ${selected.name}: ${selected.stock} ${selected.unit || 'un'}` : 'Registre uma entrada, saída, ajuste ou perda.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-3">
        <Field label="Produto *">
          <Select value={form.productId} onValueChange={(v) => set('productId', v)} disabled={!!product}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
            <SelectContent>
              {(products.length ? products : product ? [product] : []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.stock !== undefined ? `(${p.stock})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo *">
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={isAjuste ? 'Estoque final' : 'Quantidade *'}>
            <Input
              type="number" step="0.01" min="0"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
            />
          </Field>
        </div>

        {isEntrada && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-md bg-muted/50 border">
            <Field label="Novo lote">
              <Input value={form.lot} onChange={(e) => set('lot', e.target.value)} placeholder="Lote" />
            </Field>
            <Field label="Validade">
              <Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
            </Field>
            <Field label="Custo unit. (R$)">
              <Input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set('cost', e.target.value)} />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              Em entradas/suprimentos, os campos acima atualizam lote, validade e custo do produto.
            </p>
          </div>
        )}

        <Field label="Motivo / Observação">
          <Textarea
            value={form.reason}
            onChange={(e) => set('reason', e.target.value)}
            placeholder="Ex: Compra #1234 / Perda por vencimento / Ajuste de inventário…"
            className="min-h-20"
          />
        </Field>

        {selected && (
          <div className="text-xs text-muted-foreground flex items-center justify-between border-t pt-2">
            <span>Estoque atual: <strong>{selected.stock}</strong> {selected.unit}</span>
            <span>
              Após: <strong>
                {isAjuste
                  ? Number(form.quantity)
                  : isEntrada
                    ? selected.stock + Number(form.quantity || 0)
                    : selected.stock - Number(form.quantity || 0)}
              </strong> {selected.unit}
            </span>
          </div>
        )}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={saving}><X className="w-4 h-4 mr-1" />Cancelar</Button>
        </DialogClose>
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Registrar
        </Button>
      </DialogFooter>
    </>
  )
}

// ============================================================
// TAB: MOVIMENTAÇÕES
// ============================================================
function MovementsTab() {
  const [productId, setProductId] = useState('all')
  const { data, loading } = useFetch(`/api/stock/movements?productId=${productId}&limit=100`, [productId])
  const products = useFetch('/api/products?active=1', [])
  const movements: any[] = data?.movements ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" /> Histórico de movimentações
          </h3>
          <p className="text-sm text-muted-foreground">{movements.length} registro(s) recentes</p>
        </div>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Filtrar por produto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {(products.data?.products ?? []).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : movements.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="w-10 h-10" />}
              title="Nenhuma movimentação"
              hint="Registre entradas, saídas, ajustes ou perdas na aba Produtos."
            />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const meta = typeMeta(m.type)
                    const positive = ['entrada', 'suprimento'].includes(m.type)
                    const ajuste = m.type === 'ajuste'
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                            {positive ? <TrendingUp className="w-3 h-3" /> : ajuste ? <Settings2 className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{m.product?.name || '—'}</span>
                            <span className="text-xs text-muted-foreground">
                              {m.product?.category?.name || 'Sem categoria'}
                              {m.product?.brand ? ` · ${m.product.brand}` : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${meta.color}`}>
                            {ajuste ? '=' : positive ? '+' : '-'}{m.quantity}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{m.product?.unit || 'un'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{m.reason || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{m.createdBy || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
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
    </div>
  )
}

// ============================================================
// TAB: FORNECEDORES
// ============================================================
const emptySupplier = {
  id: '', companyName: '', tradeName: '', cnpj: '', cpf: '', phone: '',
  whatsapp: '', email: '', address: '', contact: '', observations: '',
}

function SuppliersTab() {
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const { data, loading, reload } = useFetch(`/api/suppliers?q=${encodeURIComponent(q)}`, [q])

  const handleSave = async (form: any) => {
    setSaving(true)
    try {
      await apiPost('/api/suppliers', form)
      toast({ title: editing ? 'Fornecedor atualizado' : 'Fornecedor criado' })
      setFormOpen(false); setEditing(null); reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const suppliers: any[] = data?.suppliers ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Fornecedores</h3>
          <p className="text-sm text-muted-foreground">{suppliers.length} cadastrado(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Novo fornecedor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por empresa, CNPJ, contato…" className="pl-9" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState icon={<Truck className="w-10 h-10" />} title="Nenhum fornecedor" hint="Cadastre fornecedores para vincular aos produtos." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="py-4 gap-3">
              <CardContent className="px-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold leading-tight">{s.companyName}</p>
                    {s.tradeName && <p className="text-sm text-muted-foreground">{s.tradeName}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => { setEditing(s); setFormOpen(true) }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {s.cnpj && <Badge variant="outline" className="font-normal">CNPJ: {s.cnpj}</Badge>}
                  {s.cpf && <Badge variant="outline" className="font-normal">CPF: {s.cpf}</Badge>}
                  {s._count?.products !== undefined && (
                    <Badge variant="secondary" className="font-normal">{s._count.products} produto(s)</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1 pt-1">
                  {s.contact && <p className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> {s.contact}</p>}
                  {s.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {s.phone}</p>}
                  {s.whatsapp && <p className="flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5" /> {s.whatsapp}</p>}
                  {s.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {s.email}</p>}
                  {s.address && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {s.address}</p>}
                </div>
                {s.observations && (
                  <p className="text-xs text-muted-foreground border-t pt-2 italic">{s.observations}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  )
}

function SupplierFormDialog({
  open, onOpenChange, editing, saving, onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: any
  saving: boolean
  onSave: (form: any) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        {open && (
          <SupplierFormInner
            key={editing?.id || 'new'}
            editing={editing}
            saving={saving}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SupplierFormInner({
  editing, saving, onSave,
}: {
  editing: any
  saving: boolean
  onSave: (form: any) => void
}) {
  const [form, setForm] = useState<any>(() =>
    editing ? { ...emptySupplier, ...editing } : emptySupplier,
  )
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          {editing ? 'Editar fornecedor' : 'Novo fornecedor'}
        </DialogTitle>
        <DialogDescription>Preencha os dados do fornecedor. *</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Razão social *">
          <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
        </Field>
        <Field label="Nome fantasia">
          <Input value={form.tradeName || ''} onChange={(e) => set('tradeName', e.target.value)} />
        </Field>
        <Field label="CNPJ">
          <Input value={form.cnpj || ''} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="CPF">
          <Input value={form.cpf || ''} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" />
        </Field>
        <Field label="Telefone">
          <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} />
        </Field>
        <Field label="E-mail" className="sm:col-span-2">
          <Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Contato (pessoa)">
          <Input value={form.contact || ''} onChange={(e) => set('contact', e.target.value)} placeholder="Nome do representante" />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Textarea value={form.observations || ''} onChange={(e) => set('observations', e.target.value)} className="min-h-20" />
        </Field>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={saving}><X className="w-4 h-4 mr-1" />Cancelar</Button>
        </DialogClose>
        <Button onClick={() => onSave(form)} disabled={saving || !form.companyName?.trim()}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {editing ? 'Salvar' : 'Criar'}
        </Button>
      </DialogFooter>
    </>
  )
}

// ============================================================
// TAB: CATEGORIAS
// ============================================================
function CategoriesTab() {
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, loading, reload } = useFetch('/api/products/categories', [])

  const submit = async () => {
    if (!name.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await apiPost('/api/products/categories', { id: editing?.id, name })
      toast({ title: editing ? 'Categoria atualizada' : 'Categoria criada' })
      setFormOpen(false); setEditing(null); setName(''); reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const categories: any[] = data?.categories ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Tags className="w-4 h-4 text-primary" /> Categorias de produto</h3>
          <p className="text-sm text-muted-foreground">{categories.length} categoria(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setName(''); setFormOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nova categoria
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState icon={<Tags className="w-10 h-10" />} title="Nenhuma categoria" hint="Crie categorias para organizar seus produtos." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((c) => (
            <Card key={c.id} className="py-3 gap-2">
              <CardContent className="px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c._count?.products ?? 0} produto(s)</p>
                  </div>
                </div>
                <Button
                  size="icon" variant="ghost" className="size-8 shrink-0"
                  onClick={() => { setEditing(c); setName(c.name); setFormOpen(true) }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </DialogTitle>
            <DialogDescription>Digite o nome da categoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nome *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Colas, Cílios, Ferramentas…"
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Cancelar</Button>
            </DialogClose>
            <Button onClick={submit} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// helpers / sub-componentes
// ============================================================
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function KpiCard({
  label, value, icon, tone = 'default',
}: { label: string; value: React.ReactNode; icon: React.ReactNode; tone?: 'default' | 'warn' }) {
  return (
    <Card className="py-4 gap-1">
      <CardContent className="px-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-semibold ${tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : ''}`}>{value}</p>
        </div>
        <div className={`size-9 rounded-md flex items-center justify-center ${tone === 'warn' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="p-12 text-center">
      <div className="text-muted-foreground/40 mb-3 flex justify-center">{icon}</div>
      <p className="text-muted-foreground font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground/70 mt-1">{hint}</p>}
    </div>
  )
}
