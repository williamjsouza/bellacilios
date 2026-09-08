import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    const { id } = await params

    // Check dependencies
    const countAppts = await db.appointment.count({ where: { professionalId: id } })
    if (countAppts > 0) {
      return Response.json({ error: 'Não é possível excluir: existem agendamentos vinculados a este profissional. Recomendamos inativá-lo.' }, { status: 400 })
    }

    const countComm = await db.commission.count({ where: { professionalId: id } })
    if (countComm > 0) {
      return Response.json({ error: 'Não é possível excluir: existem comissões vinculadas a este profissional. Recomendamos inativá-lo.' }, { status: 400 })
    }

    // Delete related service mappings first
    await db.serviceProfessional.deleteMany({ where: { professionalId: id } })
    
    // Delete professional
    await db.professional.delete({ where: { id } })
    
    await db.auditLog.create({ data: { userId: user?.id, action: 'delete', entity: 'professional', entityId: id } })
    return Response.json({ ok: true })
  } catch (e: any) {
    if (e.code === 'P2003') {
       return Response.json({ error: 'Erro de integridade: existem registros vinculados a este profissional.' }, { status: 400 })
    }
    return errorResponse(e)
  }
}
