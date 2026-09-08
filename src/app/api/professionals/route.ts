import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await getSessionUser()
    const activeOnly = req.nextUrl.searchParams.get('active') === '1'
    const where = activeOnly ? { active: true } : {}
    const professionals = await db.professional.findMany({
      where, orderBy: { name: 'asc' },
      include: { serviceProf: { include: { Service: true } } },
    })
    return Response.json({ professionals })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { id, serviceIds, ...data } = body
    let prof
    if (id) {
      prof = await db.professional.update({ where: { id }, data })
    } else {
      prof = await db.professional.create({ data })
    }
    // sync services
    if (serviceIds) {
      await db.serviceProfessional.deleteMany({ where: { professionalId: prof.id } })
      for (const sid of serviceIds) {
        await db.serviceProfessional.create({ data: { professionalId: prof.id, serviceId: sid } })
      }
    }
    await db.auditLog.create({ data: { userId: user?.id, action: id ? 'update' : 'create', entity: 'professional', entityId: prof.id } })
    return Response.json({ professional: prof })
  } catch (e) { return errorResponse(e) }
}
