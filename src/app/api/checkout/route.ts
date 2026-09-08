import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

// GET /api/checkout?clientId=X  → busca sale aberta do cliente
// GET /api/checkout?saleId=X    → busca sale específica por ID
export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const saleId = req.nextUrl.searchParams.get('saleId')
    const clientId = req.nextUrl.searchParams.get('clientId')

    if (saleId) {
      // Buscar sale específica pelo ID (usada quando vem do atendimento)
      const sale = await db.sale.findUnique({
        where: { id: saleId },
        include: {
          items: { include: { service: true, product: true } },
          payments: true,
          client: true,
        },
      })
      return Response.json({ sale: sale?.status === 'aberta' ? sale : null })
    }

    if (!clientId) return Response.json({ error: 'clientId ou saleId obrigatório' }, { status: 400 })

    let sale = await db.sale.findFirst({
      where: { clientId, status: 'aberta' },
      include: {
        items: { include: { service: true, product: true } },
        payments: true,
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Se não há sale aberta, verificar se existem agendamentos do dia para pré-carregar
    if (!sale) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
      const todayAppts = await db.appointment.findMany({
        where: {
          clientId,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ['confirmado', 'em_atendimento', 'finalizado'] },
        },
        include: { service: true },
      })

      if (todayAppts.length > 0) {
        // Criar sale e popular com os agendamentos do dia
        sale = await db.sale.create({ data: { clientId, status: 'aberta', subtotal: 0, discount: 0, total: 0 } }) as any
        for (const appt of todayAppts) {
          if (!appt.serviceId || !appt.service) continue
          const unitPrice = appt.price ?? appt.service.price
          await db.saleItem.create({
            data: {
              saleId: sale!.id,
              serviceId: appt.serviceId,
              description: appt.service.name,
              quantity: 1,
              unitPrice,
              total: unitPrice,
            },
          })
        }
        const subtotal = todayAppts.reduce((s, a) => s + (a.price ?? a.service?.price ?? 0), 0)
        await db.sale.update({ where: { id: sale!.id }, data: { subtotal, total: subtotal } })
        sale = await db.sale.findUnique({
          where: { id: sale!.id },
          include: { items: { include: { service: true, product: true } }, payments: true, client: true },
        }) as any
      }
    }

    return Response.json({ sale })
  } catch (e) { return errorResponse(e) }
}

// POST /api/checkout → cria ou retorna sale aberta, adiciona item, ou processa pagamento
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { action, clientId, saleId, item, payments: paymentsList, discount, observations } = body

    // --- Criar nova venda em aberto (ou recuperar existente) ---
    if (action === 'open') {
      let sale = await db.sale.findFirst({ where: { clientId, status: 'aberta' }, orderBy: { createdAt: 'desc' } })
      if (!sale) {
        sale = await db.sale.create({ data: { clientId, status: 'aberta', subtotal: 0, discount: 0, total: 0 } })
      }

      // Se veio com item manual (ex: pré-carregado pelo atendimento), adicionar
      if (item) {
        const existingItem = await db.saleItem.findFirst({ where: { saleId: sale.id, serviceId: item.serviceId ?? null, description: item.description } })
        if (!existingItem) {
          await db.saleItem.create({
            data: {
              saleId: sale.id,
              serviceId: item.serviceId || null,
              productId: item.productId || null,
              description: item.description,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice ?? 0,
              total: (item.quantity ?? 1) * (item.unitPrice ?? 0),
            },
          })
          await recalcSale(sale.id)
        }
      }

      // Auto-carregar agendamentos do DIA que ainda não estão na fatura
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
      const todayAppts = await db.appointment.findMany({
        where: {
          clientId,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ['confirmado', 'em_atendimento', 'finalizado'] },
        },
        include: { service: true },
      })

      for (const appt of todayAppts) {
        if (!appt.serviceId || !appt.service) continue
        // Verificar se já existe na sale para não duplicar
        const alreadyIn = await db.saleItem.findFirst({
          where: { saleId: sale.id, serviceId: appt.serviceId },
        })
        if (!alreadyIn) {
          const unitPrice = appt.price ?? appt.service.price
          await db.saleItem.create({
            data: {
              saleId: sale.id,
              serviceId: appt.serviceId,
              description: appt.service.name,
              quantity: 1,
              unitPrice,
              total: unitPrice,
            },
          })
        }
      }

      await recalcSale(sale.id)
      const updated = await db.sale.findUnique({
        where: { id: sale.id },
        include: { items: { include: { service: true, product: true } }, payments: true, client: true },
      })
      return Response.json({ sale: updated })
    }


    // --- Adicionar item à venda ---
    if (action === 'add-item') {
      const saleItem = await db.saleItem.create({
        data: {
          saleId,
          serviceId: item.serviceId || null,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          total: (item.quantity ?? 1) * (item.unitPrice ?? 0),
        },
      })
      await recalcSale(saleId)
      const updated = await db.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { service: true, product: true } }, payments: true, client: true },
      })
      return Response.json({ sale: updated })
    }

    // --- Remover item da venda ---
    if (action === 'remove-item') {
      await db.saleItem.delete({ where: { id: item.id } })
      await recalcSale(saleId)
      const updated = await db.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { service: true, product: true } }, payments: true, client: true },
      })
      return Response.json({ sale: updated })
    }

    // --- Atualizar desconto ---
    if (action === 'set-discount') {
      await db.sale.update({ where: { id: saleId }, data: { discount: discount ?? 0 } })
      await recalcSale(saleId)
      const updated = await db.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { service: true, product: true } }, payments: true, client: true },
      })
      return Response.json({ sale: updated })
    }

    // --- Finalizar pagamento ---
    if (action === 'pay') {
      const sale = await db.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { service: true } }, client: true },
      })
      if (!sale) return Response.json({ error: 'Venda não encontrada' }, { status: 404 })

      const discountVal = discount ?? sale.discount ?? 0
      const subtotal = sale.items.reduce((s, i) => s + i.total, 0)
      const total = Math.max(0, subtotal - discountVal)

      // Criar pagamentos
      const totalPaid = (paymentsList as any[]).reduce((s: number, p: any) => s + p.amount, 0)
      for (const p of paymentsList as any[]) {
        await db.payment.create({ data: { saleId: sale.id, method: p.method, amount: p.amount } })
      }

      // Marcar venda como paga
      await db.sale.update({
        where: { id: sale.id },
        data: { status: 'paga', discount: discountVal, subtotal, total, observations: observations || null },
      })

      // Criar AccountReceivable paga (entrada financeira)
      await db.accountReceivable.create({
        data: {
          clientId: sale.clientId,
          saleId: sale.id,
          description: `Atendimento – ${sale.items.map(i => i.description).join(', ')}`,
          amount: total,
          dueDate: new Date(),
          paidAt: new Date(),
          method: (paymentsList as any[])[0]?.method ?? 'outro',
          status: 'paga',
        },
      })

      // CashMovement por método de pagamento
      const openCash = await db.cashRegister.findFirst({ where: { status: 'aberto' } })
      if (openCash) {
        for (const p of paymentsList as any[]) {
          await db.cashMovement.create({
            data: {
              cashId: openCash.id,
              type: 'entrada',
              amount: p.amount,
              method: p.method,
              description: `Venda #${sale.id.slice(-6)} – ${sale.client?.name ?? ''}`,
              operatorId: user?.id,
            },
          })
        }
      }

      // Atualizar totais do cliente
      await db.client.update({
        where: { id: sale.clientId },
        data: {
          lastVisit: new Date(),
          totalVisits: { increment: 1 },
          totalSpent: { increment: total },
        },
      })

      // Comissões por item de serviço
      for (const saleItem of sale.items) {
        if (saleItem.serviceId) {
          const svc = saleItem.service
          if (svc) {
            // buscar profissional do procedimento vinculado à sale
            const proc = await db.procedure.findFirst({ where: { clientId: sale.clientId }, orderBy: { createdAt: 'desc' } })
            if (proc?.professionalId) {
              const prof = await db.professional.findUnique({ where: { id: proc.professionalId } })
              const pct = svc.commissionPct ?? prof?.commission ?? 0
              if (pct > 0) {
                await db.commission.create({
                  data: {
                    professionalId: proc.professionalId,
                    procedureId: proc.id,
                    amount: saleItem.total * (pct / 100),
                    percentage: pct,
                  },
                })
              }
            }
          }
        }
      }

      await db.auditLog.create({
        data: {
          userId: user?.id,
          action: 'pay',
          entity: 'sale',
          entityId: sale.id,
          newValue: JSON.stringify({ total, methods: paymentsList }),
        },
      })

      return Response.json({ ok: true, saleId: sale.id, total })
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (e) { return errorResponse(e) }
}

async function recalcSale(saleId: string) {
  const items = await db.saleItem.findMany({ where: { saleId } })
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const sale = await db.sale.findUnique({ where: { id: saleId } })
  const discount = sale?.discount ?? 0
  await db.sale.update({
    where: { id: saleId },
    data: { subtotal, total: Math.max(0, subtotal - discount) },
  })
}
