import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const status = req.nextUrl.searchParams.get('status')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // mark overdue
    await db.accountPayable.updateMany({
      where: { status: 'aberta', dueDate: { lt: today } },
      data: { status: 'vencida' },
    })

    const where: any = {}
    if (status && status !== 'all') where.status = status

    const items = await db.accountPayable.findMany({
      where,
      include: { supplier: true },
      orderBy: { dueDate: 'asc' },
      take: 500,
    })

    const open = items.filter((i) => i.status !== 'paga')
    const totalOpen = open.reduce((s, i) => s + i.amount, 0)

    return Response.json({ items, totalOpen })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { description, amount, dueDate, category, supplierId, costCenter, method } = body
    if (!description || !amount || !dueDate || !category) {
      return Response.json({ error: 'Descrição, valor, vencimento e categoria são obrigatórios' }, { status: 400 })
    }
    const item = await db.accountPayable.create({
      data: {
        description,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        category,
        supplierId: supplierId || null,
        costCenter: costCenter || null,
        status: 'aberta',
      },
    })
    await db.auditLog.create({ data: { userId: user?.id, action: 'create', entity: 'accountPayable', entityId: item.id, newValue: JSON.stringify({ description, amount, dueDate, category }) } })
    return Response.json({ item })
  } catch (e) { return errorResponse(e) }
}
