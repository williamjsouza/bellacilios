import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest) {
  try {
    await getSessionUser()
    const templates = await db.messageTemplate.findMany({ orderBy: { name: 'asc' } })
    return Response.json({ templates })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, content, name, active } = body
    let t
    if (id) {
      t = await db.messageTemplate.update({ where: { id }, data: { content, name, active } })
    } else {
      t = await db.messageTemplate.create({ data: { key: body.key, name, content, active: active ?? true } })
    }
    await db.auditLog.create({ data: { userId: user?.id, action: id ? 'update' : 'create', entity: 'messageTemplate', entityId: t.id } })
    return Response.json({ template: t })
  } catch (e) { return errorResponse(e) }
}
