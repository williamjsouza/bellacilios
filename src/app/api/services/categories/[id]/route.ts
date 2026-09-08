import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await req.json()
    const cat = await db.serviceCategory.update({
      where: { id },
      data: { name: data.name }
    })
    return NextResponse.json(cat)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.serviceCategory.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message.includes('Foreign key') ? 'Não é possível excluir: Categoria possui serviços.' : error.message }, { status: 500 })
  }
}
