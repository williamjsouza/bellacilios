import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

// Helper: compute totals by method for a set of movements
function computeTotals(movements: any[], openingAmount: number) {
  const totals: Record<string, { entrada: number; saida: number; saldo: number }> = {}
  const methods = ['dinheiro', 'pix', 'cartao', 'credito', 'debito', 'transferencia', 'boleto', 'outro']
  for (const m of methods) totals[m] = { entrada: 0, saida: 0, saldo: 0 }
  // opening amount counts as dinheiro entrada
  totals['dinheiro'].entrada += openingAmount
  for (const mv of movements) {
    const method = totals[mv.method] ? mv.method : 'outro'
    if (mv.type === 'entrada' || mv.type === 'suprimento') {
      totals[method].entrada += mv.amount
    } else if (mv.type === 'saida' || mv.type === 'sangria') {
      totals[method].saida += mv.amount
    }
    totals[method].saldo = totals[method].entrada - totals[method].saida
  }
  for (const m of methods) totals[m].saldo = totals[m].entrada - totals[m].saida
  const totalEntrada = Object.values(totals).reduce((s, t) => s + t.entrada, 0)
  const totalSaida = Object.values(totals).reduce((s, t) => s + t.saida, 0)
  return { totals, totalEntrada, totalSaida, balance: totalEntrada - totalSaida }
}

export async function GET() {
  try {
    await getSessionUser()
    const open = await db.cashRegister.findFirst({
      where: { status: 'aberto' },
      include: { movements: { include: { operator: true }, orderBy: { createdAt: 'asc' } } },
      orderBy: { openedAt: 'desc' },
    })
    if (!open) {
      return Response.json({ cash: null, movements: [], totals: null, balance: 0 })
    }
    const computed = computeTotals(open.movements, open.openingAmount)
    return Response.json({ cash: open, movements: open.movements, ...computed })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()

    // Branch A: open new cash register (no cashId provided)
    if (!body.cashId) {
      const openingAmount = Number(body.openingAmount) || 0
      // close any already-open register (safety)
      const existing = await db.cashRegister.findFirst({ where: { status: 'aberto' } })
      if (existing) {
        return Response.json({ error: 'Já existe um caixa aberto. Feche-o antes de abrir outro.' }, { status: 400 })
      }
      const cash = await db.cashRegister.create({
        data: {
          openingAmount,
          status: 'aberto',
          openedAt: new Date(),
          createdBy: user?.id,
          notes: body.notes || null,
        },
      })
      await db.auditLog.create({ data: { userId: user?.id, action: 'create', entity: 'cashRegister', entityId: cash.id, newValue: JSON.stringify({ openingAmount }) } })
      return Response.json({ cash })
    }

    // Branch B: add movement
    const { cashId, type, amount, method, description } = body
    if (!cashId || !type || !amount) {
      return Response.json({ error: 'cashId, type e amount são obrigatórios' }, { status: 400 })
    }
    const cash = await db.cashRegister.findUnique({ where: { id: cashId } })
    if (!cash || cash.status !== 'aberto') {
      return Response.json({ error: 'Caixa não encontrado ou fechado' }, { status: 400 })
    }
    const mv = await db.cashMovement.create({
      data: {
        cashId,
        type,
        amount: Number(amount),
        method: method || 'dinheiro',
        description: description || null,
        operatorId: user?.id,
      },
    })
    await db.auditLog.create({ data: { userId: user?.id, action: 'create', entity: 'cashMovement', entityId: mv.id, newValue: JSON.stringify({ type, amount, method }) } })
    return Response.json({ movement: mv })
  } catch (e) { return errorResponse(e) }
}
