import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

// Gera notificações dinamicamente a partir do estado do sistema
export async function GET(_req: NextRequest) {
  try {
    await getSessionUser()
    const now = new Date()
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)

    const notifications: any[] = []

    // Manutenções vencidas
    const procs = await db.procedure.findMany({
      where: { nextMaintenance: { not: null, lte: endToday } },
      include: { client: true },
    })
    const latestByClient = new Map<string, any>()
    for (const p of procs) {
      const cur = latestByClient.get(p.clientId)
      if (!cur || p.date > cur.date) latestByClient.set(p.clientId, p)
    }
    const maintOverdue = Array.from(latestByClient.values()).filter(p => p.nextMaintenance < startToday)
    if (maintOverdue.length > 0) {
      notifications.push({
        id: 'maint-overdue',
        type: 'manutencao',
        title: `${maintOverdue.length} manutenção(ões) de cílios vencida(s)`,
        message: 'Clientes precisam de retorno para manutenção',
        read: false,
        createdAt: now.toISOString(),
      })
    }

    // Aniversariantes (hoje e próximos 7 dias)
    const allClients = await db.client.findMany({ where: { birthDate: { not: null } }, select: { name: true, birthDate: true } })
    const upcomingBdays = allClients.filter(c => {
      if (!c.birthDate) return false
      const b = new Date(now.getFullYear(), c.birthDate.getMonth(), c.birthDate.getDate())
      let diff = Math.round((b.getTime() - startToday.getTime()) / 86400000)
      if (diff < 0) {
        b.setFullYear(now.getFullYear() + 1)
        diff = Math.round((b.getTime() - startToday.getTime()) / 86400000)
      }
      return diff >= 0 && diff <= 7
    })
    
    if (upcomingBdays.length > 0) {
      const todayCount = upcomingBdays.filter(c => {
        const b = new Date(now.getFullYear(), c.birthDate!.getMonth(), c.birthDate!.getDate())
        return Math.round((b.getTime() - startToday.getTime()) / 86400000) === 0
      }).length
      
      notifications.push({
        id: 'birthdays-upcoming',
        type: 'aniversario',
        title: `${upcomingBdays.length} aniversariante(s) nos próximos 7 dias`,
        message: `${todayCount} são hoje! ` + upcomingBdays.map(c => c.name).slice(0, 3).join(', ') + (upcomingBdays.length > 3 ? '...' : ''),
        read: false,
        createdAt: now.toISOString(),
      })
    }

    // Estoque baixo
    const products = await db.product.findMany()
    const lowStock = products.filter(p => p.stock <= p.minStock)
    if (lowStock.length > 0) {
      notifications.push({
        id: 'low-stock',
        type: 'estoque',
        title: `${lowStock.length} produto(s) com estoque baixo`,
        message: lowStock.slice(0, 3).map(p => p.name).join(', '),
        read: false,
        createdAt: now.toISOString(),
      })
    }

    // Contas vencidas
    const overduePayables = await db.accountPayable.findMany({ where: { status: 'aberta', dueDate: { lt: startToday } } })
    if (overduePayables.length > 0) {
      notifications.push({
        id: 'payables-overdue',
        type: 'conta',
        title: `${overduePayables.length} conta(s) a pagar vencida(s)`,
        message: 'Verifique o módulo Financeiro',
        read: false,
        createdAt: now.toISOString(),
      })
    }

    // Agendamentos não confirmados de hoje
    const pendingAppts = await db.appointment.count({ where: { status: 'agendado', date: { gte: startToday, lte: endToday } } })
    if (pendingAppts > 0) {
      notifications.push({
        id: 'appts-pending',
        type: 'agendamento',
        title: `${pendingAppts} agendamento(s) aguardando confirmação`,
        message: 'Hoje — confirme via WhatsApp',
        read: false,
        createdAt: now.toISOString(),
      })
    }

    // Clientes inativas (sem atendimento há mais de X dias)
    const inactiveDays = parseInt((await db.setting.findUnique({ where: { id: 'inactivityDays' } }))?.value ?? '60')
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - inactiveDays)
    const clients = await db.client.findMany({ include: { procedures: { orderBy: { date: 'desc' }, take: 1 } } })
    const inactive = clients.filter(c => {
      const last = c.procedures[0]?.date ?? c.lastVisit ?? c.createdAt
      return last < cutoff
    })
    
    if (inactive.length > 0) {
      notifications.push({
        id: 'inactive-clients',
        type: 'inativa',
        title: `${inactive.length} cliente(s) inativa(s) há mais de ${inactiveDays} dias`,
        message: inactive.map(c => c.name).slice(0, 3).join(', ') + (inactive.length > 3 ? '...' : ''),
        read: false,
        createdAt: now.toISOString(),
      })
    }

    return Response.json({ notifications })
  } catch (e) {
    return errorResponse(e)
  }
}
