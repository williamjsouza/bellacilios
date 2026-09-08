import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    const body = await req.json()
    const countedAmounts = body.countedAmounts || {} // { dinheiro, pix, cartao, ... }

    const cash = await db.cashRegister.findUnique({
      where: { id },
      include: { movements: true },
    })
    if (!cash) return Response.json({ error: 'Caixa não encontrado' }, { status: 404 })
    if (cash.status === 'fechado') return Response.json({ error: 'Caixa já está fechado' }, { status: 400 })

    // expected totals by method
    const totals: Record<string, number> = {}
    const methods = ['dinheiro', 'pix', 'cartao', 'credito', 'debito', 'transferencia', 'boleto', 'outro']
    for (const m of methods) totals[m] = 0
    totals['dinheiro'] += cash.openingAmount
    for (const mv of cash.movements) {
      const key = totals[mv.method] !== undefined ? mv.method : 'outro'
      if (mv.type === 'entrada' || mv.type === 'suprimento') totals[key] += mv.amount
      else if (mv.type === 'saida' || mv.type === 'sangria') totals[key] -= mv.amount
    }

    const expectedTotal = Object.values(totals).reduce((s, v) => s + v, 0)
    const countedTotal = Object.values(countedAmounts).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
    const difference = countedTotal - expectedTotal

    const updated = await db.cashRegister.update({
      where: { id },
      data: {
        status: 'fechado',
        closedAt: new Date(),
        closingAmount: countedTotal,
        difference,
        notes: body.notes || cash.notes,
      },
    })

    await db.auditLog.create({
      data: {
        userId: user?.id,
        action: 'update',
        entity: 'cashRegister',
        entityId: id,
        newValue: JSON.stringify({ status: 'fechado', expectedTotal, countedTotal, difference }),
      },
    })

    return Response.json({
      cash: updated,
      expected: { totals, total: expectedTotal },
      counted: { amounts: countedAmounts, total: countedTotal },
      difference,
    })
  } catch (e) { return errorResponse(e) }
}
