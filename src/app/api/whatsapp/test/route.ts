import { NextRequest } from 'next/server'
import { getSessionUser, errorResponse } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    await getSessionUser()
    const body = await req.json()
    const { url, apiKey, instance, phone } = body
    
    if (!url || !apiKey || !instance || !phone) {
      return Response.json({ error: 'Parâmetros incompletos' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const evoUrl = `${url.replace(/\/$/, '')}/message/sendText/${instance}`
    
    const evoRes = await fetch(evoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: cleanPhone,
        options: { delay: 1200, presence: "composing" },
        text: "🔔 *Teste de Conexão*\nEsta é uma mensagem de teste do sistema Bella Cílios ERP."
      })
    })

    if (!evoRes.ok) {
      const err = await evoRes.text()
      return Response.json({ error: `Evolution API Erro: ${err}` }, { status: 500 })
    }
    
    return Response.json({ success: true })
  } catch (e: any) { 
    return Response.json({ error: `Falha na requisição: ${e.message}` }, { status: 500 })
  }
}
