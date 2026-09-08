import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest) {
  try {
    await getSessionUser()
    const settings = await db.setting.findMany()
    const obj: Record<string, string> = {}
    for (const s of settings) obj[s.id] = s.value
    return Response.json({ settings: obj })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    if (body.settings) {
      for (const [k, v] of Object.entries(body.settings)) {
        await db.setting.upsert({ where: { id: k }, update: { value: String(v) }, create: { id: k, value: String(v) } })
      }
    } else if (body.key) {
      await db.setting.upsert({ where: { id: body.key }, update: { value: String(body.value) }, create: { id: body.key, value: String(body.value) } })
    }
    await db.auditLog.create({ data: { userId: user?.id, action: 'update', entity: 'settings', newValue: JSON.stringify(body) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
