import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

const ENTRADA_TYPES = ['entrada', 'suprimento']
const SAIDA_TYPES = ['saida', 'perda', 'vencimento', 'consumo']

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const productId = req.nextUrl.searchParams.get('productId')
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 500)
    const where: any = {}
    if (productId && productId !== 'all') where.productId = productId
    const movements = await db.stockMovement.findMany({
      where,
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return Response.json({ movements })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { productId, type, quantity, reason, lot, expiryDate, cost } = body

    if (!productId) return Response.json({ error: 'Produto é obrigatório' }, { status: 400 })
    if (!type) return Response.json({ error: 'Tipo de movimentação é obrigatório' }, { status: 400 })

    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      return Response.json({ error: 'Quantidade deve ser maior que zero' }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) return Response.json({ error: 'Produto não encontrado' }, { status: 404 })

    // calcula novo estoque
    let newStock = product.stock
    let signedQty = qty
    if (ENTRADA_TYPES.includes(type)) {
      newStock = product.stock + qty
      signedQty = qty
    } else if (SAIDA_TYPES.includes(type)) {
      newStock = product.stock - qty
      signedQty = -qty
    } else if (type === 'ajuste') {
      // ajuste: quantity representa o novo valor final
      newStock = qty
      signedQty = qty - product.stock
    } else {
      return Response.json({ error: 'Tipo de movimentação inválido' }, { status: 400 })
    }

    // transaction: atualiza produto + cria movimento
    const productUpdate: any = { stock: newStock }
    // em entradas/suprimentos, atualiza lote/validade/custo se informados
    if (ENTRADA_TYPES.includes(type)) {
      if (lot !== undefined && lot !== '') productUpdate.lot = lot
      if (expiryDate) productUpdate.expiryDate = new Date(expiryDate)
      if (cost !== undefined && cost !== '' && !Number.isNaN(Number(cost))) {
        productUpdate.cost = Number(cost)
      }
    }

    const [updatedProduct, movement] = await db.$transaction([
      db.product.update({ where: { id: productId }, data: productUpdate }),
      db.stockMovement.create({
        data: {
          productId,
          type,
          quantity: Math.abs(signedQty),
          reason: reason || null,
          refType: 'manual',
          createdBy: user?.name || user?.email || null,
        },
        include: { product: { include: { category: true } } },
      }),
    ])

    await db.auditLog.create({
      data: {
        userId: user?.id,
        action: 'create',
        entity: 'stockMovement',
        entityId: movement.id,
        newValue: JSON.stringify({ type, productId, quantity: signedQty, reason }),
      },
    })

    return Response.json({ movement, product: updatedProduct })
  } catch (e) {
    return errorResponse(e)
  }
}
