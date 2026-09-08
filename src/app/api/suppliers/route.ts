import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function GET() {
  try {
    await getSessionUser()
    const suppliers = await db.supplier.findMany({
      orderBy: { companyName: 'asc' },
    })
    return Response.json({ suppliers })
  } catch (e) { return errorResponse(e) }
}
