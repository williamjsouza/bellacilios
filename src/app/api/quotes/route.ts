import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const status = req.nextUrl.searchParams.get('status')
    const clientId = req.nextUrl.searchParams.get('clientId')
    const where: any = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    const quotes = await db.quote.findMany({
      where, include: { client: true, items: { include: { service: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    })
    return Response.json({ quotes })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, items, ...data } = body
    if (data.validUntil) data.validUntil = new Date(data.validUntil)
    if (data.date) data.date = new Date(data.date)

    // calcular total
    let total = 0
    for (const it of (items ?? [])) {
      it.total = (it.quantity || 1) * (it.unitPrice || 0)
      total += it.total
    }
    total = total - (data.discount || 0) + (data.addition || 0)
    data.total = total

    let quote
    if (id) {
      quote = await db.quote.update({ where: { id }, data: { clientId: data.clientId, professionalId: data.professionalId || null, validUntil: data.validUntil, discount: data.discount, addition: data.addition, total, observations: data.observations, status: data.status } })
      await db.quoteItem.deleteMany({ where: { quoteId: id } })
    } else {
      quote = await db.quote.create({ data: { clientId: data.clientId, professionalId: data.professionalId || null, validUntil: data.validUntil, discount: data.discount ?? 0, addition: data.addition ?? 0, total, observations: data.observations, status: data.status ?? 'rascunho' } })
    }
    for (const it of (items ?? [])) {
      await db.quoteItem.create({ data: { quoteId: quote.id, serviceId: it.serviceId || null, productId: it.productId || null, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, total: it.total } })
    }
    await db.auditLog.create({ data: { userId: user?.id, action: id ? 'update' : 'create', entity: 'quote', entityId: quote.id } })
    return Response.json({ quote })
  } catch (e) { return errorResponse(e) }
}
