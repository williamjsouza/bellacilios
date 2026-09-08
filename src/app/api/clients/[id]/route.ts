import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getSessionUser()
    const { id } = await params
    const client = await db.client.findUnique({
      where: { id },
      include: {
        appointments: { include: { service: true, professional: true }, orderBy: { date: 'desc' }, take: 50 },
        procedures: { include: { service: true, professional: true, photos: true }, orderBy: { date: 'desc' }, take: 50 },
        photos: { orderBy: { takenAt: 'desc' } },
        quotes: { orderBy: { createdAt: 'desc' }, take: 20 },
        sales: { include: { items: true, payments: true }, orderBy: { date: 'desc' }, take: 20 },
        receivables: { orderBy: { dueDate: 'desc' }, take: 20 },
        lashMappings: true,
        anamnesis: true,
        whatsappMsgs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!client) return Response.json({ error: 'Cliente não encontrada' }, { status: 404 })
    return Response.json({ client })
  } catch (e) { return errorResponse(e) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    const data = await req.json()
    if (data.birthDate) data.birthDate = new Date(data.birthDate)
    else if (data.birthDate === '') data.birthDate = null
    const client = await db.client.update({ where: { id }, data })
    await db.auditLog.create({ data: { userId: user?.id, action: 'update', entity: 'client', entityId: id, newValue: JSON.stringify(data) } })
    return Response.json({ client })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    
    // Deletar registros dependentes primeiro para evitar erro de Foreign Key
    await db.$transaction([
      db.appointment.deleteMany({ where: { clientId: id } }),
      db.procedure.deleteMany({ where: { clientId: id } }),
      db.sale.deleteMany({ where: { clientId: id } }),
      db.accountReceivable.deleteMany({ where: { clientId: id } }),
      db.quote.deleteMany({ where: { clientId: id } }),
      db.whatsappMessage.deleteMany({ where: { clientId: id } }),
      db.clientPhoto.deleteMany({ where: { clientId: id } }),
      db.clientDocument.deleteMany({ where: { clientId: id } }),
      db.lashMapping.deleteMany({ where: { clientId: id } }),
      db.clientAnamnesis.deleteMany({ where: { clientId: id } }),
      db.client.delete({ where: { id } }),
    ])

    await db.auditLog.create({ data: { userId: user?.id, action: 'delete', entity: 'client', entityId: id } })
    return Response.json({ success: true })
  } catch (e) { return errorResponse(e) }
}
