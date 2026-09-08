import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await db.client.findUnique({
      where: { id },
      include: { anamnesis: true }
    })
    
    if (!client) return NextResponse.json({ error: 'Cliente não encontrada' }, { status: 404 })
    
    return NextResponse.json({ client })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      hadExtensionBefore, timeWithoutExtension, previousReactions, wearingMakeup, hasAllergies, 
      thyroidProblem, sleepingSide, recentEyeProcedure, pregnantOrNursing, oncologicalTreatment, 
      skinDisease, healthTreatment, usingMedication, blepharitis, 
      wantsLongLashes, wantsCurvedLashes, expectedResult, eyeStylePreference, 
      photoAuthorization, termsAccepted 
    } = body

    const anamnesis = await db.clientAnamnesis.upsert({
      where: { clientId: id },
      update: {
        hadExtensionBefore, timeWithoutExtension, previousReactions, wearingMakeup, hasAllergies,
        thyroidProblem, sleepingSide, recentEyeProcedure, pregnantOrNursing, oncologicalTreatment,
        skinDisease, healthTreatment, usingMedication, blepharitis,
        wantsLongLashes, wantsCurvedLashes, expectedResult, eyeStylePreference,
        photoAuthorization, termsAccepted,
        termsAcceptedAt: termsAccepted ? new Date() : null
      },
      create: {
        clientId: id,
        hadExtensionBefore, timeWithoutExtension, previousReactions, wearingMakeup, hasAllergies,
        thyroidProblem, sleepingSide, recentEyeProcedure, pregnantOrNursing, oncologicalTreatment,
        skinDisease, healthTreatment, usingMedication, blepharitis,
        wantsLongLashes, wantsCurvedLashes, expectedResult, eyeStylePreference,
        photoAuthorization, termsAccepted,
        termsAcceptedAt: termsAccepted ? new Date() : null
      }
    })

    return NextResponse.json({ success: true, anamnesis })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
