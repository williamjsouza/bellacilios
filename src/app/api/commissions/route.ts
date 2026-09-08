import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const { searchParams } = new URL(req.url)
    const professionalId = searchParams.get('professionalId')
    const month = searchParams.get('month') // e.g. "9"
    const year = searchParams.get('year') // e.g. "2026"

    let where: any = {}
    if (professionalId) {
      where.professionalId = professionalId
    }
    if (month && year) {
      // month is 1-indexed (1-12)
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      where.createdAt = {
        gte: startDate,
        lte: endDate
      }
    }

    const commissions = await db.commission.findMany({
      where,
      include: {
        professional: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    })

    // Fetch related procedures and sales manually to attach details without schema migration
    const procedureIds = commissions.map(c => c.procedureId).filter(Boolean) as string[]
    const procedures = procedureIds.length > 0 
      ? await db.procedure.findMany({
          where: { id: { in: procedureIds } },
          include: { service: true, client: true }
        }) 
      : []

    const saleIds = commissions.map(c => c.saleId).filter(Boolean) as string[]
    const sales = saleIds.length > 0
      ? await db.sale.findMany({
          where: { id: { in: saleIds } },
          include: { client: true }
        })
      : []

    const procMap = new Map(procedures.map(p => [p.id, p]))
    const saleMap = new Map(sales.map(s => [s.id, s]))

    const enriched = commissions.map(c => {
      let originName = 'Lançamento Manual'
      let clientName = ''
      if (c.procedureId && procMap.has(c.procedureId)) {
        const p = procMap.get(c.procedureId)!
        originName = p.service?.name || 'Procedimento'
        clientName = p.client?.name || ''
      } else if (c.saleId && saleMap.has(c.saleId)) {
        const s = saleMap.get(c.saleId)!
        originName = 'Venda de Produtos'
        clientName = s.client?.name || ''
      }
      return {
        ...c,
        originName,
        clientName
      }
    })

    return Response.json({ commissions: enriched })
  } catch (e) { return errorResponse(e) }
}
