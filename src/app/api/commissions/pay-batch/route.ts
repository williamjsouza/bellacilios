import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const { ids } = await req.json()
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('Nenhuma comissão selecionada')
    }
    
    await db.commission.updateMany({
      where: { id: { in: ids }, status: 'aberta' },
      data: {
        status: 'paga',
        paidAt: new Date(),
      }
    })
    
    await db.auditLog.create({ 
      data: { 
        userId: user?.id, 
        action: 'update_batch', 
        entity: 'commission', 
        entityId: 'batch_payment'
      } 
    })
    
    return Response.json({ success: true })
  } catch (e) { return errorResponse(e) }
}
