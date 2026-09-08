import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth-hash'
import { setSessionCookie } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return Response.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.active) return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
    const ok = verifyPassword(password, user.passwordHash)
    if (!ok) return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
    await setSessionCookie(user.id, user.role)
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
