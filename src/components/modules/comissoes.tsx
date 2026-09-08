'use client'

import { useState, useEffect, useRef } from 'react'
import { useFetch, apiPost } from '@/lib/use-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Search, DollarSign, CheckCircle2, Printer, Filter } from 'lucide-react'

export default function ComissoesModule() {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [selMonth, setSelMonth] = useState(currentMonth.toString())
  const [selYear, setSelYear] = useState(currentYear.toString())
  const [selProf, setSelProf] = useState('')
  const [payingBatch, setPayingBatch] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  // Fetch professionals for filter
  const { data: profData } = useFetch<any>('/api/professionals?active=1')
  const professionals = profData?.professionals || []

  // Fetch commissions
  const url = `/api/commissions?month=${selMonth}&year=${selYear}${selProf ? `&professionalId=${selProf}` : ''}`
  const { data, loading, reload } = useFetch<any>(url)
  const { toast } = useToast()

  const commissions = data?.commissions ?? []

  const openStatus = commissions.filter((c: any) => c.status === 'aberta')
  const totalOpen = openStatus.reduce((acc: number, c: any) => acc + c.amount, 0)
  const paidStatus = commissions.filter((c: any) => c.status === 'paga')
  const totalPaid = paidStatus.reduce((acc: number, c: any) => acc + c.amount, 0)

  const payBatch = async () => {
    if (openStatus.length === 0) return
    if (!confirm(`Confirma o pagamento de ${openStatus.length} comissões pendentes (Total: ${formatCurrency(totalOpen)})?`)) return
    
    setPayingBatch(true)
    try {
      const ids = openStatus.map((c: any) => c.id)
      await apiPost('/api/commissions/pay-batch', { ids })
      toast({ title: 'Comissões pagas com sucesso!' })
      reload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setPayingBatch(false)
    }
  }

  const printAreaRef = useRef<HTMLDivElement>(null)

  const printReceipt = () => {
    const printContent = printAreaRef.current?.innerHTML
    const originalContent = document.body.innerHTML
    
    if (printContent) {
      document.body.innerHTML = `
        <div style="padding: 40px; font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #000;">
          ${printContent}
        </div>
      `
      window.print()
      document.body.innerHTML = originalContent
      window.location.reload()
    }
  }

  const selectedProfName = professionals.find((p: any) => p.id === selProf)?.name

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="space-y-1.5">
          <Label>Mês</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors" value={selMonth} onChange={e => setSelMonth(e.target.value)}>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('pt-BR', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Ano</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors" value={selYear} onChange={e => setSelYear(e.target.value)}>
            {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Profissional</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors" value={selProf} onChange={e => setSelProf(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {professionals.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
            <p className="text-white/80 text-sm font-medium">Comissões Pendentes (Aberto)</p>
            <p className="text-3xl font-bold">{formatCurrency(totalOpen)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
            <p className="text-white/80 text-sm font-medium">Comissões Pagas</p>
            <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
            <p className="text-white/80 text-sm font-medium">Total de Trabalhos</p>
            <p className="text-3xl font-bold">{commissions.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        {selProf && (
          <Button variant="outline" onClick={() => setReceiptOpen(true)} disabled={commissions.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Gerar Recibo do Colaborador
          </Button>
        )}
        <Button onClick={payBatch} disabled={openStatus.length === 0 || payingBatch}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {payingBatch ? 'Pagando...' : 'Pagar Comissões em Aberto'}
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle>Extrato Detalhado</CardTitle>
          <CardDescription>
            Mostrando extrato de {selectedProfName ? selectedProfName : 'todos os profissionais'} no período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {!selProf && <TableHead>Profissional</TableHead>}
                  <TableHead>Trabalho Executado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Comissão (%)</TableHead>
                  <TableHead className="text-right">Valor Pago (R$)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Carregando extrato...</TableCell></TableRow>
                ) : commissions.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Nenhum lançamento no período.</TableCell></TableRow>
                ) : (
                  commissions.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{formatDateTime(c.createdAt)}</TableCell>
                      {!selProf && <TableCell className="font-medium">{c.professional?.name}</TableCell>}
                      <TableCell className="font-medium">{c.originName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.clientName || '--'}</TableCell>
                      <TableCell className="text-right text-sm">{c.percentage}%</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(c.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'paga' ? 'secondary' : 'outline'} className={c.status === 'paga' ? 'bg-emerald-100 text-emerald-700' : 'text-amber-600 border-amber-300 bg-amber-50'}>
                          {c.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE RECIBO DE PAGAMENTO */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="hidden">
            <DialogTitle>Recibo de Pagamento</DialogTitle>
          </DialogHeader>
          
          <div className="bg-white text-black p-8 rounded-lg shadow-inner" ref={printAreaRef}>
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide">Recibo de Pagamento</h1>
                <p className="text-sm text-gray-600">Referência: {selMonth.padStart(2, '0')}/{selYear}</p>
              </div>
              <div className="text-right">
                <img src="/img/logo.png" alt="Logo" className="h-12 w-auto object-contain ml-auto opacity-80" />
                <p className="text-xs font-semibold mt-1">Studio Jéssica Novais</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="mb-2">Recebi de <strong>Studio Jéssica Novais</strong>, a importância de:</p>
                <p className="text-3xl font-bold font-mono tracking-tight">{formatCurrency(totalPaid)}</p>
                <p className="text-sm text-gray-500 mt-1 uppercase">
                  (Referente ao pagamento de {paidStatus.length} comissões executadas e baixadas).
                </p>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">Resumo das atividades remuneradas:</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th className="py-2 px-2 text-left font-semibold">Data</th>
                      <th className="py-2 px-2 text-left font-semibold">Serviço/Trabalho</th>
                      <th className="py-2 px-2 text-right font-semibold">Comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidStatus.map((c: any) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="py-1.5 px-2 text-gray-700">{formatDateTime(c.createdAt).split(' ')[0]}</td>
                        <td className="py-1.5 px-2 text-gray-800">{c.originName}</td>
                        <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(c.amount)}</td>
                      </tr>
                    ))}
                    {paidStatus.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-500 italic">Nenhuma comissão paga neste período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-16 pb-8 flex flex-col items-center justify-center">
                <div className="w-64 border-t border-black mb-2"></div>
                <p className="font-bold">{selectedProfName}</p>
                <p className="text-sm text-gray-500">Colaborador / Profissional</p>
                <p className="text-xs text-gray-400 mt-4">Data: ___/___/20__</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>Fechar</Button>
            <Button onClick={printReceipt} disabled={paidStatus.length === 0}><Printer className="w-4 h-4 mr-2" /> Imprimir Recibo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
