import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth-hash'

export async function GET(req: NextRequest) {
  const token = process.env.SEED_ADMIN_TOKEN
  const provided = req.nextUrl.searchParams.get('token')
  if (!token || !provided || provided !== token) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    return NextResponse.json({ error: 'SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD não configurados' }, { status: 400 })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hashPassword(password),
          role: 'admin',
          name: existingUser.name || 'Administrador',
        },
      })
      return NextResponse.json({ message: 'User updated' })
    }

    await prisma.user.create({
      data: {
        email,
        name: 'Administrador',
        passwordHash: hashPassword(password),
        role: 'admin',
      },
    })
    return NextResponse.json({ message: 'User created' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
