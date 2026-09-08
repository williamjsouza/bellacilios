import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET() {
  try {
    await getSessionUser()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // ---- Month-to-date totals ----
    // Receitas: payments received this month (from sales) + receivables paid this month
    const paymentsMtd = await db.payment.findMany({
      where: { createdAt: { gte: startOfMonth, lt: endOfMonth } },
    })
    const receivablesPaidMtd = await db.accountReceivable.findMany({
      where: { status: 'paga', paidAt: { gte: startOfMonth, lt: endOfMonth } },
    })
    const receitas = paymentsMtd.reduce((s, p) => s + p.amount, 0) + receivablesPaidMtd.reduce((s, r) => s + r.amount, 0)

    // Despesas: payables paid this month + commissions paid this month + cash saidas/sangrias this month
    const payablesPaidMtd = await db.accountPayable.findMany({
      where: { status: 'paga', paidAt: { gte: startOfMonth, lt: endOfMonth } },
    })
    const commissionsPaidMtd = await db.commission.findMany({
      where: { status: 'paga', paidAt: { gte: startOfMonth, lt: endOfMonth } },
    })
    const despesas =
      payablesPaidMtd.reduce((s, p) => s + p.amount, 0) +
      commissionsPaidMtd.reduce((s, c) => s + c.amount, 0)

    const lucro = receitas - despesas

    // ---- Last 7 days cash flow (entradas vs saidas) ----
    const days: { label: string; entradas: number; saidas: number; date: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      const dayPayments = await db.payment.findMany({ where: { createdAt: { gte: d, lt: next } } })
      const dayPayables = await db.accountPayable.findMany({ where: { paidAt: { gte: d, lt: next } } })
      const dayCommissions = await db.commission.findMany({ where: { paidAt: { gte: d, lt: next } } })
      const dayMovs = await db.cashMovement.findMany({ where: { createdAt: { gte: d, lt: next } } })
      const entradas =
        dayPayments.reduce((s, p) => s + p.amount, 0) +
        dayMovs.filter((m) => m.type === 'entrada' || m.type === 'suprimento').reduce((s, m) => s + m.amount, 0)
      const saidas =
        dayPayables.reduce((s, p) => s + p.amount, 0) +
        dayCommissions.reduce((s, c) => s + c.amount, 0) +
        dayMovs.filter((m) => m.type === 'saida' || m.type === 'sangria').reduce((s, m) => s + m.amount, 0)
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      days.push({ label, entradas, saidas, date: d.toISOString() })
    }

    // ---- Expenses by category (payables paid this month) ----
    const byCat: Record<string, number> = {}
    for (const p of payablesPaidMtd) {
      byCat[p.category] = (byCat[p.category] || 0) + p.amount
    }
    const expensesByCategory = Object.entries(byCat).map(([name, value]) => ({ name, value }))

    return Response.json({
      receitas,
      despesas,
      lucro,
      days,
      expensesByCategory,
    })
  } catch (e) { return errorResponse(e) }
}
