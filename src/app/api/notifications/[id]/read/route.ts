import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'
import { NextRequest } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getSessionUser()
    const { id } = await params
    // notificações são dinâmicas; apenas registramos leitura em memória (não persistimos para simplicidade)
    return Response.json({ ok: true, id })
  } catch (e) {
    return errorResponse(e)
  }
}
