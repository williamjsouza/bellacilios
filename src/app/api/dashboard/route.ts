import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest) {
  try {
    await getSessionUser()
    const now = new Date()
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Agenda hoje
    const apptsToday = await db.appointment.findMany({
      where: { date: { gte: startToday, lte: endToday } },
      include: { client: true, professional: true, service: true },
      orderBy: { startTime: 'asc' },
    })
    const confirmedToday = apptsToday.filter(a => a.status === 'confirmado').length
    const pendingToday = apptsToday.filter(a => a.status === 'agendado').length
    const cancelledToday = apptsToday.filter(a => a.status === 'cancelado' || a.status === 'nao_compareceu').length

    // Financeiro: receitas do dia (movimentações de caixa)
    const cashEntradas = await db.cashMovement.aggregate({ where: { type: 'entrada', createdAt: { gte: startToday } }, _sum: { amount: true } })
    const revenueToday = cashEntradas._sum.amount ?? 0

    const revenueMonthAgg = await db.cashMovement.aggregate({ where: { type: 'entrada', createdAt: { gte: startMonth } }, _sum: { amount: true } })
    const revenueMonth = (revenueMonthAgg._sum.amount ?? 0)

    // Receivables & payables
    const receivablesOpen = await db.accountReceivable.aggregate({ where: { status: 'aberta' }, _sum: { amount: true } })
    const payablesOpen = await db.accountPayable.aggregate({ where: { status: 'aberta' }, _sum: { amount: true } })
    const payablesOverdue = await db.accountPayable.findMany({ where: { status: 'aberta', dueDate: { lt: startToday } } })
    const payablesOverdueAmount = payablesOverdue.reduce((s, p) => s + p.amount, 0)

    // Caixa aberto
    const openCash = await db.cashRegister.findFirst({ where: { status: 'aberto' }, orderBy: { openedAt: 'desc' } })
    const cashIn = openCash ? await db.cashMovement.aggregate({ where: { cashId: openCash.id, type: { in: ['entrada', 'suprimento'] } }, _sum: { amount: true } }) : { _sum: { amount: 0 } }
    const cashOut = openCash ? await db.cashMovement.aggregate({ where: { cashId: openCash.id, type: { in: ['saida', 'sangria'] } }, _sum: { amount: true } }) : { _sum: { amount: 0 } }
    const cashBalance = (openCash?.openingAmount ?? 0) + (cashIn._sum.amount ?? 0) - (cashOut._sum.amount ?? 0)

    // Clientes
    const totalClients = await db.client.count()
    const startWeek = new Date(now); startWeek.setDate(startWeek.getDate() - 7)
    const newClientsWeek = await db.client.count({ where: { createdAt: { gte: startWeek } } })
    const activeClients = await db.client.count({ where: { classification: { in: ['Ativa', 'Frequente', 'VIP'] } } })
    const inactiveClients = await db.client.count({ where: { classification: 'Inativa' } })

    // Aniversariantes
    const allClients = await db.client.findMany({ where: { birthDate: { not: null } }, select: { id: true, name: true, birthDate: true, whatsapp: true } })
    const birthdaysToday = allClients.filter(c => c.birthDate && c.birthDate.getDate() === now.getDate() && c.birthDate.getMonth() === now.getMonth())
    const birthdaysWeek = allClients.filter(c => {
      if (!c.birthDate) return false
      const b = new Date(now.getFullYear(), c.birthDate.getMonth(), c.birthDate.getDate())
      const diff = Math.round((b.getTime() - startToday.getTime()) / 86400000)
      return diff >= 0 && diff <= 7
    })

    // Manutenções pendentes (procedures cuja nextMaintenance <= hoje e não tem nova procedure posterior)
    const procs = await db.procedure.findMany({
      where: { AND: [{ nextMaintenance: { not: null } }, { nextMaintenance: { lte: endToday } }] },
      include: { client: true, service: true },
      orderBy: { nextMaintenance: 'asc' },
    })
    // filtrar: pega apenas o procedimento mais recente por cliente
    const latestByClient = new Map<string, any>()
    for (const p of procs) {
      const cur = latestByClient.get(p.clientId)
      if (!cur || p.date > cur.date) latestByClient.set(p.clientId, p)
    }
    const maintenanceDue = Array.from(latestByClient.values()).map(p => ({
      clientId: p.clientId,
      clientName: p.client.name,
      lastDate: p.date,
      recommended: p.nextMaintenance,
      daysSince: Math.round((now.getTime() - p.date.getTime()) / 86400000),
      service: p.service?.name,
      status: p.nextMaintenance < startToday ? 'Vencida' : 'Hoje',
    }))

    // Estoque baixo
    const allProducts = await db.product.findMany()
    const lowStock = allProducts.filter(p => p.stock <= p.minStock).slice(0, 10)

    // Procedimentos mais vendidos (últimos 30 dias)
    const since30 = new Date(now); since30.setDate(since30.getDate() - 30)
    const recentProcs = await db.procedure.findMany({ where: { date: { gte: since30 } }, include: { service: true } })
    const svcCount = new Map<string, { name: string; count: number }>()
    for (const p of recentProcs) {
      if (!p.serviceId || !p.service) continue
      const cur = svcCount.get(p.serviceId) ?? { name: p.service.name, count: 0 }
      cur.count++
      svcCount.set(p.serviceId, cur)
    }
    const topServicesNamed = Array.from(svcCount.values()).sort((a, b) => b.count - a.count).slice(0, 5)

    // Faturamento por profissional (mês)
    const profs = await db.professional.findMany()
    const revenueByProf = await Promise.all(profs.map(async (p) => {
      const procs = await db.procedure.findMany({ where: { professionalId: p.id, date: { gte: startMonth } }, include: { service: true } })
      const total = procs.reduce((s, pr) => s + (pr.service?.price ?? 0), 0)
      return { name: p.name, color: p.color, total }
    }))
    const topProfessionals = revenueByProf.filter(p => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 5)

    // Faturamento últimos 7 dias (gráfico) - single query
    const since7 = new Date(now); since7.setDate(since7.getDate() - 6); since7.setHours(0, 0, 0, 0)
    const procs7 = await db.procedure.findMany({ where: { date: { gte: since7 } }, include: { service: true } })
    const last7Days: { day: string; total: number; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999)
      const total = procs7.filter(p => p.date >= d && p.date <= dEnd).reduce((s, p) => s + (p.service?.price ?? 0), 0)
      last7Days.push({ day: d.toISOString(), total, label: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()] })
    }

    return Response.json({
      agenda: { today: apptsToday, confirmed: confirmedToday, pending: pendingToday, cancelled: cancelledToday, total: apptsToday.length },
      finance: { revenueToday, revenueMonth, receivablesOpen: receivablesOpen._sum.amount ?? 0, payablesOpen: payablesOpen._sum.amount ?? 0, payablesOverdue: payablesOverdueAmount, cashBalance, cashOpen: !!openCash },
      clients: { total: totalClients, newWeek: newClientsWeek, active: activeClients, inactive: inactiveClients },
      birthdays: { today: birthdaysToday, weekCount: birthdaysWeek.length },
      maintenanceDue,
      lowStock: lowStock.map(p => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock, unit: p.unit })),
      topServices: topServicesNamed,
      topProfessionals,
      revenueChart: last7Days,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
