'use client'

import { useState } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/format'
import { Plus, Scissors, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ServicosModule() {
  const { data, loading, error, reload } = useFetch<any[]>('/api/services')
  const [formOpen, setFormOpen] = useState(false)
  const [catFormOpen, setCatFormOpen] = useState(false)

  if (loading) return <div className="p-6 text-muted-foreground animate-pulse">Carregando tabela de preços...</div>
  if (error) return <div className="p-6 text-red-500">Erro: {error}</div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Serviços e Preços</h2>
          <p className="text-muted-foreground text-sm mt-1">Tabela de procedimentos baseada no mercado de São Paulo.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCatFormOpen(true)} variant="outline" className="rounded-full text-slate-600"><Plus className="w-4 h-4 mr-1" /> Categoria</Button>
          <Button onClick={() => setFormOpen(true)} className="bg-primary text-white rounded-full"><Plus className="w-4 h-4 mr-1" /> Novo Serviço</Button>
        </div>
      </div>

      <div className="space-y-8">
        {data?.map(category => (
          <Card key={category.id} className="overflow-hidden shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Scissors className="w-4 h-4" />
                </div>
                <CardTitle className="text-lg text-slate-700">{category.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="pl-6">Procedimento</TableHead>
                    <TableHead className="w-[120px] text-center">Duração</TableHead>
                    <TableHead className="w-[150px] text-right">Preço Padrão</TableHead>
                    <TableHead className="w-[150px] text-center pr-6">Ciclo (Manutenção)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {category.services.map((srv: any) => (
                    <TableRow key={srv.id} className="hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-3">
                        <p className="font-medium text-slate-700 dark:text-slate-300">{srv.name}</p>
                        <p className="text-[11px] text-muted-foreground max-w-sm truncate">{srv.description}</p>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{srv.duration} min</TableCell>
                      <TableCell className="text-right font-semibold text-slate-700">{formatCurrency(srv.price)}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground pr-6">
                        {srv.maintenanceDays ? `${srv.maintenanceDays} dias` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {category.services.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum serviço cadastrado nesta categoria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      <ServiceForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => { reload(); setFormOpen(false) }} categories={data || []} />
      <CategoryForm open={catFormOpen} onOpenChange={setCatFormOpen} onSaved={() => reload()} categories={data || []} />
    </div>
  )
}

function CategoryForm({ open, onOpenChange, onSaved, categories }: any) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editName, setEditName] = useState('')

  const save = async () => {
    if (!name) return toast({ title: 'Preencha o nome da categoria', variant: 'destructive' })
    setSaving(true)
    try {
      await apiPost('/api/services', { action: 'category', name })
      toast({ title: 'Categoria salva!' })
      setName('')
      onSaved()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const saveEdit = async (id: string) => {
    if (!editName) return
    try {
      await apiPost(`/api/services/categories/${id}`, { name: editName }, 'PUT')
      toast({ title: 'Categoria atualizada!' })
      setEditingId(null)
      onSaved()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  const delCat = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria? Os serviços também serão removidos se o banco configurar CASCADE.')) return
    try {
      await apiPost(`/api/services/categories/${id}`, {}, 'DELETE')
      toast({ title: 'Categoria excluída!' })
      onSaved()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader><DialogTitle>Gerenciar Categorias</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-y-auto scroll-thin pr-2">
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nova categoria..." />
            <Button onClick={save} disabled={saving}>{saving ? '...' : 'Adicionar'}</Button>
          </div>
          
          <div className="mt-6 space-y-2">
            <Label className="text-muted-foreground">Categorias Existentes</Label>
            {categories.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-md border bg-slate-50">
                {editingId === c.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" />
                    <Button size="sm" onClick={() => saveEdit(c.id)}>Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>X</Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-sm">{c.name}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingId(c.id); setEditName(c.name) }}>Editar</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => delCat(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma categoria encontrada.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ServiceForm({ open, onOpenChange, onSaved, categories }: any) {
  const { toast } = useToast()
  const [form, setForm] = useState({ categoryId: '', name: '', description: '', price: '', duration: '', maintenanceDays: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name || !form.price || !form.categoryId) {
      toast({ title: 'Preencha Categoria, Nome e Preço.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await apiPost('/api/services', form)
      toast({ title: 'Serviço salvo!' })
      setForm({ categoryId: form.categoryId, name: '', description: '', price: '', duration: '', maintenanceDays: '' })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo Serviço / Procedimento</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <select 
              value={form.categoryId} 
              onChange={(e) => setForm({...form, categoryId: e.target.value})}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Nome do Procedimento *</Label>
            <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Ex: Extensão Volume Híbrido" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Duração (min)</Label>
              <Input type="number" value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} placeholder="Ex: 120" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ciclo de Manutenção (Dias)</Label>
            <Input type="number" value={form.maintenanceDays} onChange={(e) => setForm({...form, maintenanceDays: e.target.value})} placeholder="Ex: 15 (opcional)" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição / Observações</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Detalhes do procedimento..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
