import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getSessionUser()
    const { id } = await params
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true, supplier: true },
    })
    if (!product) return Response.json({ error: 'Produto não encontrado' }, { status: 404 })
    return Response.json({ product })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    // protege: se houver movimentações vinculadas, impede exclusão
    const hasMovements = await db.stockMovement.count({ where: { productId: id } })
    if (hasMovements > 0) {
      return Response.json(
        { error: 'Não é possível excluir: existem movimentações vinculadas a este produto. Considere inativá-lo.' },
        { status: 400 }
      )
    }
    await db.product.delete({ where: { id } })
    await db.auditLog.create({
      data: { userId: user?.id, action: 'delete', entity: 'product', entityId: id },
    })
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
