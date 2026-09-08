import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest) {
  try {
    await getSessionUser()
    const now = new Date()
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)

    // Manutenções
    const procs = await db.procedure.findMany({
      where: { nextMaintenance: { not: null, lte: endToday } },
      include: { client: true, service: true },
      orderBy: { nextMaintenance: 'asc' },
    })
    const latestByClient = new Map<string, any>()
    for (const p of procs) {
      const cur = latestByClient.get(p.clientId)
      if (!cur || p.date > cur.date) latestByClient.set(p.clientId, p)
    }
    const maintenance = Array.from(latestByClient.values()).map(p => ({
      clientId: p.clientId,
      clientName: p.client.name,
      whatsapp: p.client.whatsapp,
      lastDate: p.date,
      recommended: p.nextMaintenance,
      daysSince: Math.round((now.getTime() - p.date.getTime()) / 86400000),
      service: p.service?.name,
      status: p.nextMaintenance < startToday ? 'Vencida' : 'Hoje',
    }))

    // Aniversariantes
    const allClients = await db.client.findMany({ where: { birthDate: { not: null } }, select: { id: true, name: true, whatsapp: true, birthDate: true } })
    const birthdays = allClients.map(c => {
      if (!c.birthDate) return null
      const b = new Date(now.getFullYear(), c.birthDate.getMonth(), c.birthDate.getDate())
      let diff = Math.round((b.getTime() - startToday.getTime()) / 86400000)
      if (diff < 0) { b.setFullYear(now.getFullYear() + 1); diff = Math.round((b.getTime() - startToday.getTime()) / 86400000) }
      return { id: c.id, name: c.name, whatsapp: c.whatsapp, when: diff === 0 ? 'today' : 'upcoming', daysAhead: diff }
    }).filter(Boolean).sort((a, b) => (a!.daysAhead - b!.daysAhead)).slice(0, 10)

    // Estoque baixo
    const products = await db.product.findMany()
    const lowStock = products.filter(p => p.stock <= p.minStock).map(p => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock, unit: p.unit }))

    // Contas vencidas
    const overdue = (await db.accountPayable.findMany({ where: { status: 'aberta', dueDate: { lt: startToday } } })).map(c => ({
      id: c.id, description: c.description, amount: c.amount, dueDate: c.dueDate,
      daysOverdue: Math.round((startToday.getTime() - c.dueDate.getTime()) / 86400000),
    }))

    // Clientes inativas (sem atendimento há mais de X dias)
    const inactiveDays = parseInt((await db.setting.findUnique({ where: { id: 'inactivityDays' } }))?.value ?? '60')
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - inactiveDays)
    const clients = await db.client.findMany({ include: { procedures: { orderBy: { date: 'desc' }, take: 1 } } })
    const inactive = clients.filter(c => {
      const last = c.procedures[0]?.date ?? c.lastVisit ?? c.createdAt
      return last < cutoff
    }).map(c => ({
      id: c.id, name: c.name, whatsapp: c.whatsapp,
      daysSince: Math.round((now.getTime() - ((c.procedures[0]?.date ?? c.lastVisit ?? c.createdAt) as Date).getTime()) / 86400000),
    }))

    return Response.json({ maintenance, birthdays, lowStock, overdue, inactive })
  } catch (e) {
    return errorResponse(e)
  }
}
