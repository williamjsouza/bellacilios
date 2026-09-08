import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    const body = await req.json()
    // mark as paid
    const data: any = {
      status: 'paga',
      paidAt: new Date(),
    }
    if (body.method) data.method = body.method
    const item = await db.accountReceivable.update({ where: { id }, data })
    
    // Register in open cash if any
    const openCash = await db.cashRegister.findFirst({ where: { status: 'aberto' } })
    if (openCash) {
      await db.cashMovement.create({
        data: {
          cashId: openCash.id,
          type: 'entrada',
          amount: item.amount,
          method: body.method || 'dinheiro',
          description: `Recebimento: ${item.description}`,
          operatorId: user?.id,
        }
      })
    }
    
    await db.auditLog.create({ data: { userId: user?.id, action: 'update', entity: 'accountReceivable', entityId: id, newValue: JSON.stringify({ status: 'paga', method: body.method }) } })
    return Response.json({ item })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    await db.accountReceivable.delete({ where: { id } })
    await db.auditLog.create({ data: { userId: user?.id, action: 'delete', entity: 'accountReceivable', entityId: id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
