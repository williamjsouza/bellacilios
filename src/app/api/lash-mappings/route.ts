import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const clientId = req.nextUrl.searchParams.get('clientId')
    const where: any = {}
    if (clientId) where.clientId = clientId
    const mappings = await db.lashMapping.findMany({ where, orderBy: { createdAt: 'desc' } })
    return Response.json({ mappings })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, ...data } = body
    if (data.isDefault && data.clientId) {
      await db.lashMapping.updateMany({ where: { clientId: data.clientId }, data: { isDefault: false } })
    }
    let m
    if (id) m = await db.lashMapping.update({ where: { id }, data })
    else m = await db.lashMapping.create({ data })
    await db.auditLog.create({ data: { userId: user?.id, action: id ? 'update' : 'create', entity: 'lashMapping', entityId: m.id } })
    return Response.json({ mapping: m })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 })
    await db.lashMapping.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
