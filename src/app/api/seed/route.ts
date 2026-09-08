import { NextRequest } from 'next/server'
import { seedDatabase } from '@/lib/seed-data'

export async function POST(req: NextRequest) {
  const token = process.env.SEED_ADMIN_TOKEN
  const provided = req.nextUrl.searchParams.get('token') || req.headers.get('x-seed-token')
  if (!token || !provided || provided !== token) {
    return Response.json({ error: 'Não encontrado' }, { status: 404 })
  }

  try {
    const result = await seedDatabase()
    return Response.json(result)
  } catch (e) {
    console.error('Seed error', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
