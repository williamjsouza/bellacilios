import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest) {
  try {
    await getSessionUser()
    const logs = await db.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 100 })
    return Response.json({ logs })
  } catch (e) { return errorResponse(e) }
}
