import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'
import { renderTemplate, buildTemplateVars } from '@/lib/whatsapp-template'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { clientId, template: templateKey, customContent, to } = body

    const settingsList = await db.setting.findMany()
    const settings = settingsList.reduce((acc: any, s: any) => ({ ...acc, [s.id]: s.value }), {})
    const provider = settings.whatsappProvider

    let content = customContent || ''
    let templateName = templateKey

    if (templateKey && !customContent) {
      const tpl = await db.messageTemplate.findUnique({ where: { key: templateKey } })
      if (!tpl) return Response.json({ error: 'Template não encontrado' }, { status: 404 })
      content = tpl.content
      templateName = tpl.name
    }

    const vars = await buildTemplateVars(clientId)
    const rendered = renderTemplate(content, vars)

    // destino: whatsapp do cliente ou parâmetro to
    let destination = to
    if (!destination && clientId) {
      const client = await db.client.findUnique({ where: { id: clientId } })
      destination = client?.whatsapp || client?.phone || ''
    }
    if (!destination) return Response.json({ error: 'Cliente sem WhatsApp/telefone' }, { status: 400 })

    // Evolution API
    let errorMsg = null
    if (provider === 'evolution') {
      const url = settings.whatsappApiUrl
      const apiKey = settings.whatsappApiKey
      const instance = settings.whatsappInstance
      
      if (!url || !apiKey || !instance) {
        return Response.json({ error: 'Evolution API não configurada nas Configurações' }, { status: 400 })
      }

      const cleanPhone = destination.replace(/\D/g, '')
      if (cleanPhone.length < 10) {
        return Response.json({ error: 'Número de WhatsApp inválido' }, { status: 400 })
      }

      try {
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
            text: rendered
          })
        })

        if (!evoRes.ok) {
          const err = await evoRes.text()
          errorMsg = `Evolution API Erro: ${err}`
        }
      } catch (err: any) {
        errorMsg = `Falha na requisição: ${err.message}`
      }
    } else {
      // Simular envio
      await new Promise((r) => setTimeout(r, 200))
    }

    const msgStatus = errorMsg ? 'error' : 'sent'

    const msg = await db.whatsappMessage.create({
      data: {
        clientId: clientId || null,
        to: destination,
        template: templateKey || null,
        content: rendered,
        status: msgStatus,
        type: templateKey || 'manual',
        error: errorMsg,
        sentAt: errorMsg ? null : new Date(),
      },
    })

    if (errorMsg) {
      return Response.json({ error: errorMsg }, { status: 500 })
    }

    await db.auditLog.create({ data: { userId: user?.id, action: 'create', entity: 'whatsappMessage', entityId: msg.id, newValue: rendered } })
    return Response.json({ message: msg })
  } catch (e) { return errorResponse(e) }
}
