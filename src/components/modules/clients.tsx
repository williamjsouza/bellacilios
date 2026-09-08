'use client'

import { useState } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, initials, ageFromBirth, isBirthday } from '@/lib/format'
import { Plus, Search, Users, Cake, Eye, MessageCircle, Calendar, Edit, Trash2, ArrowLeft, Phone, Mail, MapPin, Instagram, Sparkles, Camera, Heart, DollarSign, FileText, Clock } from 'lucide-react'
import { ClientForm } from '@/components/shared/client-form'
import ClientDetail from '@/components/shared/client-detail'

const CLASSIFICATIONS = ['Nova', 'Ativa', 'Frequente', 'VIP', 'Inativa', 'Perdida']
const CLASS_COLORS: Record<string, string> = {
  Nova: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Ativa: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Frequente: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Inativa: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Perdida: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function ClientsModule() {
  const { page, clientId, setModule, setPage, openClient } = useAppStore()
  const [q, setQ] = useState('')
  const [classification, setClassification] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editClient, setEditClient] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()

  const { data, loading, reload } = useFetch(`/api/clients?q=${encodeURIComponent(q)}&classification=${classification}`, [q, classification])

  const setEditClientAndOpen = (c: any) => {
    setEditClient(c)
    setFormOpen(true)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir esta cliente? O histórico associado não poderá ser recuperado.')) return
    try {
      await apiPost(`/api/clients/${id}`, {}, 'DELETE')
      toast({ title: 'Cliente excluída com sucesso!' })
      reload()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' })
    }
  }

  if (page === 'detail' && clientId) {
    return (
      <>
        <ClientDetail key={`${clientId}-${refreshKey}`} clientId={clientId} onBack={() => { setPage('list'); openClient('') }} onEdit={(c) => { setEditClient(c); setFormOpen(true) }} />
        <ClientForm open={formOpen} onOpenChange={setFormOpen} client={editClient} onSaved={(c) => { reload(); setFormOpen(false); setRefreshKey(k => k + 1); openClient(c.id) }} />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{data?.clients?.length ?? 0} cliente(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => { setEditClient(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nova cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, CPF, telefone…" className="pl-9" />
        </div>
        <Select value={classification} onValueChange={setClassification}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Classificação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando…</div>
          ) : !data?.clients?.length ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma cliente encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.clients.map((c: any) => {
                const bday = isBirthday(c.birthDate)
                const age = ageFromBirth(c.birthDate)
                return (
                  <div key={c.id} className="w-full flex items-center gap-3 p-2 sm:p-3 hover:bg-accent transition-colors">
                    <button onClick={() => openClient(c.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="w-10 h-10 bg-primary/15"><AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">{initials(c.name)}</AvatarFallback></Avatar>
                        {bday && <span className="absolute -top-1 -right-1 text-xs">🎂</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{c.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CLASS_COLORS[c.classification] || ''}`}>{c.classification}</span>
                          {bday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 font-medium">Aniversário hoje</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.whatsapp && `WhatsApp ${c.whatsapp}`, c.phone && `Tel ${c.phone}`, age && `${age} anos`, c.city].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end text-right shrink-0 pr-2 border-r">
                        <p className="text-sm font-semibold">{formatCurrency(c.totalSpent)}</p>
                        <p className="text-xs text-muted-foreground">{c.totalVisits} visita(s)</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0 pl-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setEditClientAndOpen(c); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(e, c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex" onClick={() => openClient(c.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientForm open={formOpen} onOpenChange={setFormOpen} client={editClient} onSaved={(c) => { reload(); setFormOpen(false); openClient(c.id) }} />
    </div>
  )
}
