import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getSessionUser()
    const { id } = await params
    const proc = await db.procedure.findUnique({
      where: { id },
      include: { client: true, professional: true, service: true, photos: true, consumptions: { include: { product: true } } },
    })
    return Response.json({ procedure: proc })
  } catch (e) { return errorResponse(e) }
}
