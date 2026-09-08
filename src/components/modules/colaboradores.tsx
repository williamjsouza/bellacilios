'use client'

import { useState } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/format'
import { Plus, Edit, Trash2, Search, UserCircle, Briefcase, DollarSign, Clock } from 'lucide-react'

export default function ColaboradoresModule() {
  const { data, loading, reload } = useFetch<any>('/api/professionals')
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const profs = data?.professionals ?? []
  const filtered = profs.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()) || p.role?.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (p: any) => {
    setEditing(p)
    setFormOpen(true)
  }

  const removeProf = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este colaborador?')) return
    try {
      await apiPost(`/api/professionals/${id}`, {}, 'DELETE')
      toast({ title: 'Colaborador excluído' })
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
          <Input placeholder="Buscar colaborador..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Colaborador</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo / Especialidades</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum colaborador encontrado.</TableCell></TableRow>
                ) : (
                  filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold shadow-sm" style={{ backgroundColor: p.color }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-medium">{p.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{p.role}</p>
                        <p className="text-xs text-muted-foreground">{p.specialties || 'Geral'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{p.whatsapp || p.phone || 'Sem número'}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.commission}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? 'secondary' : 'outline'} className={p.active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}>
                          {p.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeProf(p.id)}><Trash2 className="w-4 h-4" /></Button>
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

      <ColaboradorForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={() => { reload(); setFormOpen(false) }} />
    </div>
  )
}

function ColaboradorForm({ open, onOpenChange, editing, onSaved }: any) {
  const { toast } = useToast()
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  // Initialize form when editing changes
  if (open && editing && form.id !== editing.id) {
    setForm({ ...editing })
  } else if (open && !editing && form.id !== undefined) {
    setForm({ role: 'Lash Designer', commission: 40, active: true, color: '#c084fc', workStart: '09:00', workEnd: '18:00', workDays: '1,2,3,4,5,6' })
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name) { toast({ title: 'Preencha o nome', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const { id, name, email, phone, whatsapp, role, specialties, color, workStart, workEnd, workDays, commission, active } = form
      const payload = { id, name, email, phone, whatsapp, role, specialties, color, workStart, workEnd, workDays, commission, active }
      await apiPost('/api/professionals', payload)
      toast({ title: editing ? 'Colaborador atualizado' : 'Colaborador cadastrado' })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#d946ef', '#f43f5e', '#64748b']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
          <DialogDescription>Preencha as informações do perfil profissional.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dados Pessoais */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-1"><UserCircle className="w-4 h-4" /> Dados Pessoais</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nome Completo *</Label><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} /></div>
            </div>
          </div>

          {/* Dados Profissionais */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-1"><Briefcase className="w-4 h-4" /> Perfil Profissional</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cargo principal</Label><Input value={form.role || ''} onChange={(e) => set('role', e.target.value)} placeholder="Ex: Lash Designer, Esteticista..." /></div>
              <div className="space-y-1.5"><Label>Especialidades</Label><Input value={form.specialties || ''} onChange={(e) => set('specialties', e.target.value)} placeholder="Ex: Fio a fio, Volume Russo..." /></div>
              <div className="space-y-1.5">
                <Label>Cor na Agenda</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => set('color', c)} className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color === c ? 'scale-125 border-white shadow-md' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Financeiro e Jornada */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-1"><DollarSign className="w-4 h-4" /> Financeiro e Horários</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Comissão (%)</Label><Input type="number" value={form.commission ?? 0} onChange={(e) => set('commission', parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-1.5"><Label>Horário Início</Label><Input type="time" value={form.workStart || ''} onChange={(e) => set('workStart', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Horário Fim</Label><Input type="time" value={form.workEnd || ''} onChange={(e) => set('workEnd', e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={form.active !== false} onCheckedChange={(c) => set('active', c)} />
              <Label>Profissional ativo na clínica</Label>
            </div>
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
