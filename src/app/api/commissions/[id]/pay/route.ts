import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    const { id } = params
    
    const commission = await db.commission.findUnique({ where: { id } })
    if (!commission) throw new Error('Comissão não encontrada')
    
    if (commission.status === 'paga') {
      throw new Error('Comissão já foi paga')
    }
    
    const updated = await db.commission.update({
      where: { id },
      data: {
        status: 'paga',
        paidAt: new Date(),
      }
    })
    
    await db.auditLog.create({ 
      data: { 
        userId: user?.id, 
        action: 'update', 
        entity: 'commission', 
        entityId: id 
      } 
    })
    
    // Opcional: adicionar lançamento de saída no caixa ou contas a pagar (lançamento automático)
    // omitido para simplificação.
    
    return Response.json({ success: true, commission: updated })
  } catch (e) { return errorResponse(e) }
}
