import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET() {
  try {
    await getSessionUser()
    const categories = await db.productCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    return Response.json({ categories })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, name } = body
    if (!name || !name.trim()) {
      return Response.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 })
    }
    let category
    if (id) {
      category = await db.productCategory.update({ where: { id }, data: { name: name.trim() } })
    } else {
      category = await db.productCategory.create({ data: { name: name.trim() } })
    }
    await db.auditLog.create({
      data: {
        userId: user?.id,
        action: id ? 'update' : 'create',
        entity: 'productCategory',
        entityId: category.id,
        newValue: JSON.stringify({ name }),
      },
    })
    return Response.json({ category })
  } catch (e) {
    return errorResponse(e)
  }
}
