import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')
    const professionalId = req.nextUrl.searchParams.get('professionalId')
    const where: any = {}
    if (from && to) {
      const [fy, fm, fd] = from.split('T')[0].split('-').map(Number)
      const [ty, tm, td] = to.split('T')[0].split('-').map(Number)
      const f = new Date(fy, fm - 1, fd, 0, 0, 0, 0)
      const t = new Date(ty, tm - 1, td, 23, 59, 59, 999)
      where.date = { gte: f, lte: t }
    }
    if (professionalId) where.professionalId = professionalId
    const appointments = await db.appointment.findMany({
      where, include: { client: true, professional: true, service: true },
      orderBy: { date: 'asc' },
    })
    return Response.json({ appointments })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, serviceIds, ...data } = body
    if (data.date) {
      if (typeof data.date === 'string' && data.date.includes('-')) {
         const [y, m, d] = data.date.split('T')[0].split('-').map(Number)
         data.date = new Date(y, m - 1, d, 12, 0, 0, 0)
      } else {
         data.date = new Date(data.date)
      }
    }
    
    const singleServiceId = (serviceIds && serviceIds.length > 0) ? serviceIds[0] : data.serviceId
    if (singleServiceId) data.serviceId = singleServiceId

    if (data.professionalId && data.date && data.startTime && data.endTime) {
      const dayStart = new Date(data.date); dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(data.date); dayEnd.setHours(23,59,59,999)
      const conflictWhere: any = {
        professionalId: data.professionalId,
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['cancelado', 'nao_compareceu'] },
        OR: [
          { startTime: { lt: data.endTime }, endTime: { gt: data.startTime } },
        ],
      }
      if (id) conflictWhere.id = { not: id } // ignore self

      const conflicts = await db.appointment.findMany({ where: conflictWhere })
      if (conflicts.length > 0) {
        return Response.json({ error: 'Conflito de horário: o profissional já possui atendimento neste período' }, { status: 400 })
      }
    }

    let appt
    if (serviceIds && serviceIds.length > 1) {
      let currentStartMin = parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1] || '0')
      
      for (let i = 0; i < serviceIds.length; i++) {
        const sid = serviceIds[i]
        const svc = await db.service.findUnique({ where: { id: sid } })
        if (!svc) continue
        
        const startStr = `${String(Math.floor(currentStartMin/60)).padStart(2,'0')}:${String(currentStartMin%60).padStart(2,'0')}`
        const endMin = currentStartMin + svc.duration
        const endStr = `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`
        
        const apptData = { ...data, serviceId: sid, startTime: startStr, endTime: endStr, duration: svc.duration, price: svc.price, createdBy: user?.id }
        
        if (i === 0 && id) {
          appt = await db.appointment.update({ where: { id }, data: apptData })
          await db.auditLog.create({ data: { userId: user?.id, action: 'update', entity: 'appointment', entityId: appt.id } })
        } else {
          const newAppt = await db.appointment.create({ data: apptData })
          await db.auditLog.create({ data: { userId: user?.id, action: 'create', entity: 'appointment', entityId: newAppt.id } })
          if (i === 0) appt = newAppt
        }
        
        currentStartMin = endMin
      }
      return Response.json({ appointment: appt })
    }

    // Single appointment (creation or update)
    if (id) {
      appt = await db.appointment.update({ where: { id }, data })
    } else {
      appt = await db.appointment.create({ data: { ...data, createdBy: user?.id } })
    }
    await db.auditLog.create({ data: { userId: user?.id, action: id ? 'update' : 'create', entity: 'appointment', entityId: appt.id } })
    return Response.json({ appointment: appt })
  } catch (e) { return errorResponse(e) }
}
