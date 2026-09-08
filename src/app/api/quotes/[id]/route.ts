import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getSessionUser()
    const { id } = await params
    const quote = await db.quote.findUnique({
      where: { id },
      include: { client: true, items: { include: { service: true, product: true } } },
    })
    if (!quote) return Response.json({ error: 'Não encontrado' }, { status: 404 })
    return Response.json({ quote })
  } catch (e) { return errorResponse(e) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    const body = await req.json()
    const quote = await db.quote.update({ where: { id }, data: body })
    // Se status=aprovado, opcionalmente converter em venda (chamada separada)
    await db.auditLog.create({ data: { userId: user?.id, action: 'update', entity: 'quote', entityId: id, newValue: JSON.stringify(body) } })
    return Response.json({ quote })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    await db.quoteItem.deleteMany({ where: { quoteId: id } })
    await db.quote.delete({ where: { id } })
    await db.auditLog.create({ data: { userId: user?.id, action: 'delete', entity: 'quote', entityId: id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
