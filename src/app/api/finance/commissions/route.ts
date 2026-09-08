import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const status = req.nextUrl.searchParams.get('status')
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const items = await db.commission.findMany({
      where,
      include: {
        professional: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const open = items.filter((i) => i.status === 'aberta')
    const totalToPay = open.reduce((s, i) => s + i.amount, 0)

    return Response.json({ items, totalToPay })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const ids: string[] = body.ids || []
    if (!ids.length) {
      return Response.json({ error: 'Selecione ao menos uma comissão' }, { status: 400 })
    }
    const result = await db.commission.updateMany({
      where: { id: { in: ids }, status: 'aberta' },
      data: { status: 'paga', paidAt: new Date() },
    })
    await db.auditLog.create({ data: { userId: user?.id, action: 'update', entity: 'commission', newValue: JSON.stringify({ ids, count: result.count }) } })
    return Response.json({ ok: true, updated: result.count })
  } catch (e) { return errorResponse(e) }
}
