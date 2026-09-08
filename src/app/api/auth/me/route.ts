import { getSessionUser } from '@/lib/session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return Response.json({ user: null })
  return Response.json({ user })
}
