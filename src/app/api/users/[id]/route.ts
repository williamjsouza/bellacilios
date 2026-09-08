import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (user?.role !== 'admin') throw new Error('Acesso negado')
    
    const { id } = params
    if (id === user.id) throw new Error('Você não pode excluir a si mesmo')
    
    await db.user.delete({ where: { id } })
    await db.auditLog.create({ data: { userId: user.id, action: 'delete', entity: 'user', entityId: id } })
    
    return Response.json({ success: true })
  } catch (e) { return errorResponse(e) }
}
