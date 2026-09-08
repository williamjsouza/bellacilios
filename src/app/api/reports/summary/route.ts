import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const fromStr = req.nextUrl.searchParams.get('from')
    const toStr = req.nextUrl.searchParams.get('to')
    const now = new Date()
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    from.setHours(0, 0, 0, 0); to.setHours(23, 59, 59, 999)

    const [procedures, appointments, sales, clients, products, payables, receivables, cashMovs, commissions] = await Promise.all([
      db.procedure.findMany({ where: { date: { gte: from, lte: to } }, include: { service: true, professional: true } }),
      db.appointment.findMany({ where: { date: { gte: from, lte: to } } }),
      db.sale.findMany({ where: { date: { gte: from, lte: to } }, include: { items: true } }),
      db.client.findMany(),
      db.product.findMany(),
      db.accountPayable.findMany({ where: { dueDate: { gte: from, lte: to } } }),
      db.accountReceivable.findMany({ where: { dueDate: { gte: from, lte: to } } }),
      db.cashMovement.findMany({ where: { createdAt: { gte: from, lte: to } } }),
      db.commission.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { professional: true } }),
    ])

    const revenue = procedures.reduce((s, p) => s + (p.service?.price ?? 0), 0) + sales.reduce((s, sa) => s + sa.total, 0)
    const expenses = payables.filter(p => p.paidAt).reduce((s, p) => s + p.amount, 0) + commissions.filter(c => c.paidAt).reduce((s, c) => s + c.amount, 0)
    const ticketMedio = procedures.length > 0 ? revenue / procedures.length : 0

    // Taxa de retorno: clientes com >1 procedimento no período
    const visitsByClient = new Map<string, number>()
    procedures.forEach(p => visitsByClient.set(p.clientId, (visitsByClient.get(p.clientId) ?? 0) + 1))
    const returningClients = Array.from(visitsByClient.values()).filter(v => v > 1).length
    const totalClientsInPeriod = visitsByClient.size
    const taxaRetorno = totalClientsInPeriod > 0 ? (returningClients / totalClientsInPeriod) * 100 : 0

    // Taxa de cancelamento e faltas
    const totalAppts = appointments.length
    const cancelados = appointments.filter(a => a.status === 'cancelado').length
    const faltas = appointments.filter(a => a.status === 'nao_compareceu').length
    const taxaCancelamento = totalAppts > 0 ? (cancelados / totalAppts) * 100 : 0
    const taxaFaltas = totalAppts > 0 ? (faltas / totalAppts) * 100 : 0

    // Ocupação: agendamentos realizados vsslots possíveis (8h-20h, 12h/dia, dias no período)
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
    const slotsPossiveis = days * 12 // 12 slots de 1h por dia aproximado
    const ocupacao = slotsPossiveis > 0 ? Math.min(100, (appointments.filter(a => a.status !== 'cancelado').length / slotsPossiveis) * 100) : 0

    // Procedimentos mais realizados
    const svcCount = new Map<string, { name: string; count: number; total: number }>()
    for (const p of procedures) {
      if (!p.service) continue
      const cur = svcCount.get(p.serviceId!) ?? { name: p.service.name, count: 0, total: 0 }
      cur.count++; cur.total += p.service.price
      svcCount.set(p.serviceId!, cur)
    }
    const topServices = Array.from(svcCount.values()).sort((a, b) => b.count - a.count).slice(0, 10)

    // Faturamento por profissional
    const profRev = new Map<string, { name: string; total: number; count: number }>()
    for (const p of procedures) {
      if (!p.professional) continue
      const cur = profRev.get(p.professionalId) ?? { name: p.professional.name, total: 0, count: 0 }
      cur.total += p.service?.price ?? 0; cur.count++
      profRev.set(p.professionalId, cur)
    }
    const revenueByProf = Array.from(profRev.values()).sort((a, b) => b.total - a.total)

    // Clientes: novas no período, ativas, inativas, aniversariantes do mês
    const newClients = clients.filter(c => c.createdAt >= from && c.createdAt <= to).length
    const active = clients.filter(c => ['Ativa','Frequente','VIP'].includes(c.classification)).length
    const inactive = clients.filter(c => c.classification === 'Inativa').length
    const birthdaysMonth = clients.filter(c => c.birthDate && c.birthDate.getMonth() === now.getMonth()).length

    // Estoque baixo
    const lowStock = products.filter(p => p.stock <= p.minStock)

    return Response.json({
      kpis: { revenue, expenses, profit: revenue - expenses, ticketMedio, taxaRetorno, taxaCancelamento, taxaFaltas, ocupacao },
      topServices, revenueByProf,
      clients: { total: clients.length, newClients, active, inactive, birthdaysMonth },
      lowStock,
    })
  } catch (e) { return errorResponse(e) }
}
