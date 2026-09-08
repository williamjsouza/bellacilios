import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    const data = await req.json()
    if (data.date) data.date = new Date(data.date)
    const appt = await db.appointment.update({ where: { id }, data })
    await db.auditLog.create({ data: { userId: user?.id, action: 'update', entity: 'appointment', entityId: id, newValue: JSON.stringify(data) } })
    return Response.json({ appointment: appt })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    // Remove linked procedure if exists (1:1 relation)
    const linkedProc = await db.procedure.findUnique({ where: { appointmentId: id } })
    if (linkedProc) {
      await db.procedureConsumption.deleteMany({ where: { procedureId: linkedProc.id } })
      await db.procedure.delete({ where: { id: linkedProc.id } })
    }
    await db.appointment.delete({ where: { id } })
    await db.auditLog.create({ data: { userId: user?.id, action: 'delete', entity: 'appointment', entityId: id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
