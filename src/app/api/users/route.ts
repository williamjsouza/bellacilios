import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'
import { hashPassword } from '@/lib/auth-hash'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (user?.role !== 'admin') throw new Error('Acesso negado')
    
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' }
    })
    return Response.json({ users })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (user?.role !== 'admin') throw new Error('Acesso negado')
    
    const body = await req.json()
    const { id, name, email, password, role, active } = body
    
    let dbUser
    if (id) {
      const dataToUpdate: any = { name, email, role, active }
      if (password) {
        dataToUpdate.passwordHash = hashPassword(password)
      }
      dbUser = await db.user.update({ where: { id }, data: dataToUpdate })
      await db.auditLog.create({ data: { userId: user.id, action: 'update', entity: 'user', entityId: id } })
    } else {
      dbUser = await db.user.create({
        data: {
          name,
          email,
          passwordHash: hashPassword(password || '123456'),
          role: role || 'recepcionista',
          active: active !== false
        }
      })
      await db.auditLog.create({ data: { userId: user.id, action: 'create', entity: 'user', entityId: dbUser.id } })
    }
    
    return Response.json({ user: dbUser })
  } catch (e) { return errorResponse(e) }
}
