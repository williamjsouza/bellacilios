import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const q = req.nextUrl.searchParams.get('q')?.trim()
    const categoryId = req.nextUrl.searchParams.get('categoryId')
    const activeOnly = req.nextUrl.searchParams.get('active') === '1'
    const where: any = {}
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { barcode: { contains: q } },
        { brand: { contains: q } },
      ]
    }
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId
    if (activeOnly) where.active = true
    const products = await db.product.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
      take: 500,
    })
    return Response.json({ products })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, ...data } = body
    // normaliza números
    for (const k of ['cost', 'price', 'stock', 'minStock']) {
      if (data[k] === '' || data[k] === null || data[k] === undefined) {
        data[k] = 0
      } else {
        data[k] = Number(data[k])
      }
    }
    // normaliza strings opcionais -> null
    for (const k of ['code', 'barcode', 'brand', 'lot', 'categoryId', 'supplierId']) {
      if (data[k] === '' || data[k] === undefined) data[k] = null
    }
    // normaliza datas
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate)
    else data.expiryDate = null
    if (!data.unit) data.unit = 'un'
    if (typeof data.active !== 'boolean') data.active = true

    let product
    if (id) {
      product = await db.product.update({
        where: { id },
        data,
        include: { category: true, supplier: true },
      })
    } else {
      product = await db.product.create({
        data,
        include: { category: true, supplier: true },
      })
    }
    await db.auditLog.create({
      data: {
        userId: user?.id,
        action: id ? 'update' : 'create',
        entity: 'product',
        entityId: product.id,
        newValue: JSON.stringify(data),
      },
    })
    return Response.json({ product })
  } catch (e) {
    return errorResponse(e)
  }
}
