import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-hash'

export async function POST(req: NextRequest) {
  try {
    const { token, name, email, password } = await req.json()

    if (!token || !name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    const envToken = process.env.SETUP_TOKEN
    if (!envToken) {
      return NextResponse.json({ error: 'SETUP_TOKEN não configurado no servidor' }, { status: 403 })
    }

    if (token !== envToken) {
      return NextResponse.json({ error: 'Setup Token inválido' }, { status: 401 })
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já existe. Use outra página para gerenciar usuários.' }, { status: 400 })
    }

    const dbUser = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: 'admin',
        active: true
      }
    })

    return NextResponse.json({ message: 'Usuário administrador criado com sucesso!', user: dbUser })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
