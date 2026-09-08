import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const q = req.nextUrl.searchParams.get('q')?.trim()
    const classification = req.nextUrl.searchParams.get('classification')
    const where: any = {}
    if (q) {
      where.OR = [
        { name: { contains: q } }, { socialName: { contains: q } },
        { cpf: { contains: q } }, { phone: { contains: q } },
        { whatsapp: { contains: q } }, { email: { contains: q } },
      ]
    }
    if (classification && classification !== 'all') where.classification = classification
    const clients = await db.client.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
    })
    return Response.json({ clients })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, ...data } = body
    // normalizar birthDate
    if (data.birthDate) data.birthDate = new Date(data.birthDate)
    else data.birthDate = null
    let client
    if (id) {
      client = await db.client.update({ where: { id }, data })
    } else {
      client = await db.client.create({ data })
    }
    await db.auditLog.create({ data: { userId: user?.id, action: id ? 'update' : 'create', entity: 'client', entityId: client.id, newValue: JSON.stringify(data) } })
    return Response.json({ client })
  } catch (e) { return errorResponse(e) }
}
