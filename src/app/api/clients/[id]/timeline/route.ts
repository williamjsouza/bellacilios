import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getSessionUser()
    const { id } = await params
    const [appointments, procedures, sales, quotes, photos, whatsappMsgs, receivables] = await Promise.all([
      db.appointment.findMany({ where: { clientId: id }, include: { service: true, professional: true }, orderBy: { date: 'desc' }, take: 50 }),
      db.procedure.findMany({ where: { clientId: id }, include: { service: true, professional: true, photos: true }, orderBy: { date: 'desc' }, take: 50 }),
      db.sale.findMany({ where: { clientId: id }, include: { items: true, payments: true }, orderBy: { date: 'desc' }, take: 30 }),
      db.quote.findMany({ where: { clientId: id }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
      db.clientPhoto.findMany({ where: { clientId: id }, orderBy: { takenAt: 'desc' } }),
      db.whatsappMessage.findMany({ where: { clientId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      db.accountReceivable.findMany({ where: { clientId: id }, orderBy: { dueDate: 'desc' }, take: 30 }),
    ])
    const events: any[] = []
    appointments.forEach(a => events.push({ type: 'appointment', date: a.date, data: a }))
    procedures.forEach(p => events.push({ type: 'procedure', date: p.date, data: p }))
    sales.forEach(s => events.push({ type: 'sale', date: s.date, data: s }))
    quotes.forEach(q => events.push({ type: 'quote', date: q.createdAt, data: q }))
    whatsappMsgs.forEach(w => events.push({ type: 'whatsapp', date: w.createdAt, data: w }))
    receivables.forEach(r => events.push({ type: 'receivable', date: r.createdAt, data: r }))
    photos.forEach(p => events.push({ type: 'photo', date: p.takenAt, data: p }))
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return Response.json({ events })
  } catch (e) { return errorResponse(e) }
}
