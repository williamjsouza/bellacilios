import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const status = req.nextUrl.searchParams.get('status')
    const where: any = {}
    if (status) where.status = status
    const messages = await db.whatsappMessage.findMany({
      where, include: { client: true }, orderBy: { createdAt: 'desc' }, take: 100,
    })
    return Response.json({ messages })
  } catch (e) { return errorResponse(e) }
}
