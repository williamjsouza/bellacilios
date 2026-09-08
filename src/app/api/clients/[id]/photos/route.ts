import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params
    const body = await req.json()
    const { category, url, observation, procedureId } = body
    const photo = await db.clientPhoto.create({
      data: { clientId: id, category, url, observation, procedureId: procedureId || null, professional: user?.name, takenAt: new Date() },
    })
    return Response.json({ photo })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getSessionUser()
    const { id } = await params
    const photoId = req.nextUrl.searchParams.get('photoId')
    if (photoId) await db.clientPhoto.delete({ where: { id: photoId } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
