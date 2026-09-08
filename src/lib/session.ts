import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { parseSessionToken, SESSION_COOKIE, createSessionToken } from '@/lib/auth-hash'

export type AppUser = {
  id: string
  name?: string | null
  email?: string | null
  role: string
}

export async function getSessionUser(): Promise<AppUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    const parsed = parseSessionToken(token)
    if (!parsed) return null
    const user = await db.user.findUnique({ where: { id: parsed.userId } })
    if (!user || !user.active) return null
    return { id: user.id, name: user.name, email: user.email, role: user.role }
  } catch {
    return null
  }
}

export async function requireUser(allowedRoles?: string[]): Promise<AppUser> {
  const user = await getSessionUser()
  if (!user) throw new Error('UNAUTHORIZED')
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new Error('FORBIDDEN')
  return user
}

export function errorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : 'Erro interno'
  if (msg === 'UNAUTHORIZED') return Response.json({ error: 'Não autenticado' }, { status: 401 })
  if (msg === 'FORBIDDEN') return Response.json({ error: 'Sem permissão' }, { status: 403 })
  return Response.json({ error: msg }, { status: 500 })
}

export async function setSessionCookie(userId: string, role: string) {
  const token = createSessionToken({ id: userId, role })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// Matrix RBAC: módulo -> permissões por role
export const MODULE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  dashboard: { admin: ['view'], gestor: ['view'], recepcionista: ['view'], profissional: ['view'], financeiro: ['view'] },
  clients: { admin: ['view','create','edit','delete'], gestor: ['view','create','edit'], recepcionista: ['view','create','edit'], profissional: ['view','edit'], financeiro: ['view'] },
  agenda: { admin: ['view','create','edit','delete'], gestor: ['view','create','edit'], recepcionista: ['view','create','edit','delete'], profissional: ['view','edit'], financeiro: ['view'] },
  lash: { admin: ['view','create','edit','delete'], gestor: ['view'], recepcionista: ['view'], profissional: ['view','create','edit'], financeiro: [] },
  atendimento: { admin: ['view','create','edit'], gestor: ['view'], recepcionista: ['view','create'], profissional: ['view','create','edit'], financeiro: [] },
  estoque: { admin: ['view','create','edit','delete'], gestor: ['view','create','edit'], recepcionista: ['view'], profissional: ['view'], financeiro: ['view'] },
  financeiro: { admin: ['view','create','edit','delete'], gestor: ['view','create','edit'], recepcionista: [], profissional: [], financeiro: ['view','create','edit','delete'] },
  orcamentos: { admin: ['view','create','edit','delete'], gestor: ['view','create','edit'], recepcionista: ['view','create','edit'], profissional: ['view','create'], financeiro: ['view'] },
  whatsapp: { admin: ['view','send'], gestor: ['view','send'], recepcionista: ['view','send'], profissional: ['view','send'], financeiro: [] },
  relatorios: { admin: ['view'], gestor: ['view'], recepcionista: [], profissional: [], financeiro: ['view'] },
  configuracoes: { admin: ['view','edit'], gestor: [], recepcionista: [], profissional: [], financeiro: [] },
}

export function canAccess(role: string, module: string, action = 'view'): boolean {
  const perms = MODULE_PERMISSIONS[module]?.[role] ?? []
  return perms.includes(action)
}
