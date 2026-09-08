'use client'

import { useState } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Search, Settings } from 'lucide-react'

export default function UsuariosModule() {
  const { data, loading, reload } = useFetch<any>('/api/users')
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const users = data?.users ?? []
  const filtered = users.filter((u: any) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (u: any) => {
    setEditing(u)
    setFormOpen(true)
  }

  const removeUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      await apiPost(`/api/users/${id}`, {}, 'DELETE')
      toast({ title: 'Usuário excluído' })
      reload()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuário..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Usuário</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhum usuário encontrado.</TableCell></TableRow>
                ) : (
                  filtered.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.active ? 'secondary' : 'outline'} className={u.active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeUser(u.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UsuarioForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={() => { reload(); setFormOpen(false) }} />
    </div>
  )
}

function UsuarioForm({ open, onOpenChange, editing, onSaved }: any) {
  const { toast } = useToast()
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  if (open && editing && form.id !== editing.id) {
    setForm({ ...editing, password: '' })
  } else if (open && !editing && form.id !== undefined) {
    setForm({ role: 'recepcionista', active: true })
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const { id, name, email, password, role, active } = form
      const payload = { id, name, email, password, role, active }
      await apiPost('/api/users', payload)
      toast({ title: editing ? 'Usuário atualizado' : 'Usuário cadastrado' })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          <DialogDescription>Controle de acesso ao sistema.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Nome Completo *</Label><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>E-mail (Login) *</Label><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>{editing ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</Label>
            <Input type="password" value={form.password || ''} onChange={(e) => set('password', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Perfil de Acesso</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.role || 'recepcionista'}
              onChange={(e) => set('role', e.target.value)}
            >
              <option value="admin">Administrador</option>
              <option value="gestor">Gestor</option>
              <option value="recepcionista">Recepcionista</option>
              <option value="profissional">Profissional</option>
              <option value="financeiro">Financeiro</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={form.active !== false} onCheckedChange={(c) => set('active', c)} />
            <Label>Usuário ativo</Label>
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
