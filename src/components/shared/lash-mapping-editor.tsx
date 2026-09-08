'use client'

import { useState, useEffect } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Eye, Save, Trash2, Plus, Copy } from 'lucide-react'

const DEFAULT_LENGTHS = ['8','9','10','11','12','11','10','9']
const LENGTHS = ['6','7','8','9','10','11','12','13','14','15']

export function LashMappingEditor({ clientId }: { clientId: string }) {
  const { data, reload } = useFetch<any>(`/api/lash-mappings?clientId=${clientId}`)
  const { toast } = useToast()
  const [editing, setEditing] = useState<any>(null)

  useEffect(() => {
    if (data?.mappings?.length && !editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing(data.mappings.find((m:any) => m.isDefault) ?? data.mappings[0])
    }
  }, [data])

  const newMapping = () => setEditing({
    name: 'Novo Mapping', clientId,
    leftEye: JSON.stringify(DEFAULT_LENGTHS), rightEye: JSON.stringify(DEFAULT_LENGTHS),
    curvature: 'CC', thickness: '0.07', technique: 'Volume Russo', effect: 'Boneca', isDefault: false,
  })

  const save = async () => {
    try {
      await apiPost('/api/lash-mappings', editing)
      toast({ title: 'Mapping salvo' })
      reload()
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }) }
  }

  const del = async (id: string) => {
    if (!confirm('Excluir mapping?')) return
    await fetch(`/api/lash-mappings?id=${id}`, { method: 'DELETE' })
    reload(); setEditing(null)
  }

  const dup = (m: any) => {
    setEditing({ ...m, id: undefined, name: `${m.name} (cópia)`, isDefault: false })
  }

  const setLength = (side: 'left' | 'right', idx: number, val: string) => {
    const key = side === 'left' ? 'leftEye' : 'rightEye'
    const arr = JSON.parse(editing[key])
    arr[idx] = val
    setEditing({ ...editing, [key]: JSON.stringify(arr) })
  }

  const setAll = (side: 'left' | 'right', val: string) => {
    const key = side === 'left' ? 'leftEye' : 'rightEye'
    const arr = JSON.parse(editing[key])
    setEditing({ ...editing, [key]: JSON.stringify(arr.map(() => val)) })
  }

  const addCell = (side: 'left' | 'right') => {
    const key = side === 'left' ? 'leftEye' : 'rightEye'
    const arr = JSON.parse(editing[key])
    arr.push('9')
    setEditing({ ...editing, [key]: JSON.stringify(arr) })
  }

  const removeCell = (side: 'left' | 'right') => {
    const key = side === 'left' ? 'leftEye' : 'rightEye'
    const arr = JSON.parse(editing[key])
    if (arr.length > 4) { arr.pop(); setEditing({ ...editing, [key]: JSON.stringify(arr) }) }
  }

  const leftArr = editing ? JSON.parse(editing.leftEye) : []
  const rightArr = editing ? JSON.parse(editing.rightEye) : []

  return (
    <Card className="border-pink-200/50 shadow-sm">
      <CardHeader className="pb-2 border-b bg-pink-50/30">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-pink-500" /> Mapping de Cílios</CardTitle>
          <Button size="sm" onClick={newMapping} className="bg-pink-500 hover:bg-pink-600 text-white rounded-full"><Plus className="w-4 h-4 mr-1" /> Novo Mapping</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {data?.mappings?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {data.mappings.map((m: any) => (
              <div key={m.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${editing?.id === m.id ? 'bg-pink-100 border-pink-300 text-pink-900 font-semibold shadow-sm' : 'bg-white hover:bg-slate-50'}`}>
                <button onClick={() => setEditing(m)}>{m.name}{m.isDefault ? ' ⭐' : ''}</button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={() => dup(m)} className="text-slate-400 hover:text-slate-700" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                {editing?.id !== m.id && <button onClick={() => del(m.id)} className="text-slate-400 hover:text-red-500" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl border bg-white shadow-sm">
              <div className="space-y-1.5"><Label className="text-xs text-slate-500 font-medium">Nome do Mapping</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="bg-slate-50" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-slate-500 font-medium">Técnica (Efeito)</Label><Input value={editing.technique ?? ''} onChange={(e) => setEditing({ ...editing, technique: e.target.value })} className="bg-slate-50" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-slate-500 font-medium">Curvatura</Label>
                <Select value={editing.curvature ?? ''} onValueChange={(v) => setEditing({ ...editing, curvature: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger><SelectContent>{['J','B','C','CC','D','M','L','LC','LD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs text-slate-500 font-medium">Espessura</Label>
                <Select value={editing.thickness ?? ''} onValueChange={(v) => setEditing({ ...editing, thickness: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger><SelectContent>{['0.03','0.05','0.07','0.10','0.12','0.15','0.20'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 lg:col-span-4 flex items-center gap-3 pt-2">
                <Switch checked={!!editing.isDefault} onCheckedChange={(v) => setEditing({ ...editing, isDefault: v })} id="def" className="data-[state=checked]:bg-pink-500" />
                <Label htmlFor="def" className="text-sm cursor-pointer">Definir como mapping padrão desta cliente</Label>
              </div>
            </div>

            {/* Mapas dos olhos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Olho Esquerdo */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-6">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Olho Esquerdo</h4>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => removeCell('left')}>-</Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => addCell('left')}>+</Button>
                  </div>
                </div>
                
                <div className="relative w-full flex flex-col items-center">
                  <div className="flex items-end justify-center gap-1.5 sm:gap-2 mb-2 w-full overflow-x-auto pb-2 scroll-thin">
                    {leftArr.map((len: string, i: number) => (
                      <div key={i} className="flex flex-col items-center group">
                        <select 
                          value={len} 
                          onChange={(e) => setLength('left', i, e.target.value)} 
                          className="w-10 sm:w-12 h-10 appearance-none outline-none text-center font-bold text-pink-600 bg-white border-2 border-pink-200 hover:border-pink-400 rounded-t-xl rounded-b-md shadow-sm cursor-pointer"
                        >
                          {LENGTHS.map(l => <option key={l} value={l}>{l}mm</option>)}
                        </select>
                        <div className="w-px h-8 border-l-2 border-dashed border-slate-300 mt-2 group-hover:border-pink-300 transition-colors" />
                      </div>
                    ))}
                  </div>
                  {/* Arco do olho com Cílios */}
                  <div className="w-full relative flex items-center justify-center mt-2 h-20">
                    <EyelashGraphic />
                    <span className="text-[10px] absolute left-[10%] sm:left-[20%] top-16 text-slate-400 font-bold uppercase tracking-widest bg-white/80 px-1">Interno</span>
                    <span className="text-[10px] absolute right-[10%] sm:right-[20%] top-16 text-slate-400 font-bold uppercase tracking-widest bg-white/80 px-1">Externo</span>
                  </div>
                </div>
              </div>

              {/* Olho Direito */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-6">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Olho Direito</h4>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => removeCell('right')}>-</Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => addCell('right')}>+</Button>
                  </div>
                </div>
                
                <div className="relative w-full flex flex-col items-center">
                  <div className="flex items-end justify-center gap-1.5 sm:gap-2 mb-2 w-full overflow-x-auto pb-2 scroll-thin">
                    {rightArr.map((len: string, i: number) => (
                      <div key={i} className="flex flex-col items-center group">
                        <select 
                          value={len} 
                          onChange={(e) => setLength('right', i, e.target.value)} 
                          className="w-10 sm:w-12 h-10 appearance-none outline-none text-center font-bold text-pink-600 bg-white border-2 border-pink-200 hover:border-pink-400 rounded-t-xl rounded-b-md shadow-sm cursor-pointer"
                        >
                          {LENGTHS.map(l => <option key={l} value={l}>{l}mm</option>)}
                        </select>
                        <div className="w-px h-8 border-l-2 border-dashed border-slate-300 mt-2 group-hover:border-pink-300 transition-colors" />
                      </div>
                    ))}
                  </div>
                  {/* Arco do olho com Cílios */}
                  <div className="w-full relative flex items-center justify-center mt-2 h-20">
                    <EyelashGraphic reverse />
                    <span className="text-[10px] absolute left-[10%] sm:left-[20%] top-16 text-slate-400 font-bold uppercase tracking-widest bg-white/80 px-1">Externo</span>
                    <span className="text-[10px] absolute right-[10%] sm:right-[20%] top-16 text-slate-400 font-bold uppercase tracking-widest bg-white/80 px-1">Interno</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-3 pt-6 border-t">
              <Button onClick={save} className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-6"><Save className="w-4 h-4 mr-2" /> Salvar este mapping</Button>
              {editing.id && <Button variant="outline" className="rounded-full" onClick={() => dup(editing)}><Copy className="w-4 h-4 mr-2" /> Duplicar</Button>}
              {editing.id && <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full ml-auto" onClick={() => del(editing.id)}><Trash2 className="w-4 h-4 mr-2" /> Excluir</Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EyelashGraphic({ reverse }: { reverse?: boolean }) {
  return (
    <svg width="240" height="80" viewBox="0 0 240 80" className="overflow-visible pointer-events-none drop-shadow-sm">
      <g transform={reverse ? "scale(-1, 1) translate(-240, 0)" : ""}>
        {/* Íris leve no fundo */}
        <path d="M 90 70 A 30 30 0 0 1 150 70" fill="none" stroke="#d97706" strokeWidth="4" opacity="0.3" />
        {/* Pálpebra Base */}
        <path d="M 20 70 Q 120 10 220 70" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
        
        {/* Cílios distribuídos ao longo do arco */}
        <path d="M 30 63 Q 15 40 5 35" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 45 52 Q 35 25 20 15" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <path d="M 65 39 Q 60 15 50 0" fill="none" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 90 28 Q 95 5 90 -15" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        
        <path d="M 120 25 Q 125 -5 130 -25" fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
        
        <path d="M 150 28 Q 160 5 175 -10" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        <path d="M 175 39 Q 195 15 215 5" fill="none" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 195 52 Q 215 25 240 20" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <path d="M 210 63 Q 230 40 255 45" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

