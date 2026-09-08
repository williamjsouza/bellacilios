import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return Response.json({ results: [] })

    const clients = await db.client.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { socialName: { contains: q } },
          { cpf: { contains: q } },
          { phone: { contains: q } },
          { whatsapp: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 8,
    })

    const results = clients.map(c => ({
      type: 'client' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.whatsapp, c.phone, c.email].filter(Boolean).join(' · ') || 'Sem contato',
      meta: c.classification,
    }))

    return Response.json({ results })
  } catch (e) {
    return errorResponse(e)
  }
}
