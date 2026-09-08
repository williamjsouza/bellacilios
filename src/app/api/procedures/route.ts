import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const clientId = req.nextUrl.searchParams.get('clientId')
    const maintenanceOnly = req.nextUrl.searchParams.get('maintenance') === '1'
    const where: any = {}
    if (clientId) where.clientId = clientId
    const procs = await db.procedure.findMany({
      where, include: { client: true, professional: true, service: true, photos: true, consumptions: { include: { product: true } } },
      orderBy: { date: 'desc' }, take: 100,
    })
    return Response.json({ procedures: procs })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, consumptions, photos, ...data } = body
    if (data.date) data.date = new Date(data.date)
    if (data.nextMaintenance) data.nextMaintenance = new Date(data.nextMaintenance)

    // Buscar o agendamento para pegar o preço real negociado
    const appt = data.appointmentId
      ? await db.appointment.findUnique({ where: { id: data.appointmentId } })
      : null
    const apptPrice = appt?.price ?? null

    let proc
    if (id) {
      proc = await db.procedure.update({ where: { id }, data })
    } else {
      proc = await db.procedure.create({ data })
    }

    // sync consumptions (baixa de estoque)
    if (consumptions) {
      await db.procedureConsumption.deleteMany({ where: { procedureId: proc.id } })
      for (const c of consumptions) {
        if (!c.productId) continue
        await db.procedureConsumption.create({ data: { procedureId: proc.id, productId: c.productId, quantity: c.quantity, lot: c.lot || null } })
        // baixa de estoque
        const prod = await db.product.findUnique({ where: { id: c.productId } })
        if (prod) {
          await db.product.update({ where: { id: c.productId }, data: { stock: Math.max(0, prod.stock - c.quantity) } })
          await db.stockMovement.create({ data: { productId: c.productId, type: 'consumo', quantity: -c.quantity, reason: `Procedimento ${proc.id.slice(-6)}`, refType: 'procedure', refId: proc.id, createdBy: user?.id } })
        }
      }
    }

    // salvar photos
    if (photos && photos.length) {
      for (const p of photos) {
        await db.clientPhoto.create({ data: { clientId: proc.clientId, procedureId: proc.id, category: p.category, url: p.url, observation: p.observation, professional: user?.name, takenAt: new Date() } })
      }
    }

    // Atualizar estatísticas da cliente
    if (!id) {
      const client = await db.client.findUnique({ where: { id: proc.clientId } })
      if (client) {
        const svc = proc.serviceId ? await db.service.findUnique({ where: { id: proc.serviceId } }) : null
        await db.client.update({
          where: { id: proc.clientId },
          data: {
            lastVisit: proc.date,
            firstVisit: client.firstVisit ?? proc.date,
            totalVisits: { increment: 1 },
            totalSpent: { increment: svc?.price ?? 0 },
          },
        })
      }
    }

    // Criar ou atualizar venda em aberto para o cliente (checkout pendente)
    let checkoutSaleId: string | null = null
    if (!id && proc.serviceId) {
      const svc = await db.service.findUnique({ where: { id: proc.serviceId } })
      if (svc) {
        // Usar o preço do agendamento se disponível (preço negociado), senão o preço padrão do serviço
        const unitPrice = apptPrice ?? svc.price
        // Buscar ou criar Sale aberta para este cliente
        let sale = await db.sale.findFirst({ where: { clientId: proc.clientId, status: 'aberta' }, orderBy: { createdAt: 'desc' } })
        if (!sale) {
          sale = await db.sale.create({ data: { clientId: proc.clientId, status: 'aberta', subtotal: 0, discount: 0, total: 0 } })
        }
        // Verificar se o serviço deste procedimento já não está na sale (evitar duplicata ao reabrir atendimento)
        const existing = await db.saleItem.findFirst({ where: { saleId: sale.id, serviceId: svc.id } })
        if (!existing) {
          await db.saleItem.create({
            data: {
              saleId: sale.id,
              serviceId: svc.id,
              description: svc.name,
              quantity: 1,
              unitPrice,
              total: unitPrice,
            },
          })
        }
        // Recalcular totais
        const allItems = await db.saleItem.findMany({ where: { saleId: sale.id } })
        const subtotal = allItems.reduce((s, i) => s + i.total, 0)
        await db.sale.update({ where: { id: sale.id }, data: { subtotal, total: subtotal } })
        checkoutSaleId = sale.id
      }
    }

    await db.auditLog.create({ data: { userId: user?.id, action: id ? 'update' : 'create', entity: 'procedure', entityId: proc.id } })
    return Response.json({ procedure: proc, saleId: checkoutSaleId })
  } catch (e) { return errorResponse(e) }
}
