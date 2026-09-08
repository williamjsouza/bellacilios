import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const categories = await db.serviceCategory.findMany({
      include: {
        services: {
          include: { prices: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // Creating a category
    if (data.action === 'category') {
      const cat = await db.serviceCategory.create({
        data: { name: data.name, icon: data.icon || 'Tag', color: 'slate' }
      })
      return NextResponse.json(cat)
    }

    // Creating a service
    const category = await db.serviceCategory.findFirst({ where: { id: data.categoryId } }) || await db.serviceCategory.findFirst()
    const catId = data.categoryId || category?.id

    if (!catId) return NextResponse.json({ error: 'Nenhuma categoria encontrada' }, { status: 400 })

    const srv = await db.service.create({
      data: {
        name: data.name,
        description: data.description,
        duration: Number(data.duration) || 60,
        price: Number(data.price) || 0,
        categoryId: catId,
        maintenanceDays: data.maintenanceDays ? Number(data.maintenanceDays) : null
      }
    })

    return NextResponse.json(srv)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
