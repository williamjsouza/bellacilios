import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, errorResponse } from '@/lib/session'
import { renderTemplate, buildTemplateVars } from '@/lib/whatsapp-template'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    const body = await req.json()
    const { clientId, template: templateKey, customContent, to } = body

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

    // Simular envio (sem provedor real configurado): marca como sent após delay
    await new Promise((r) => setTimeout(r, 200))

    const msg = await db.whatsappMessage.create({
      data: {
        clientId: clientId || null,
        to: destination,
        template: templateKey || null,
        content: rendered,
        status: 'sent',
        type: templateKey || 'manual',
        sentAt: new Date(),
      },
    })

    await db.auditLog.create({ data: { userId: user?.id, action: 'create', entity: 'whatsappMessage', entityId: msg.id, newValue: rendered } })
    return Response.json({ message: msg })
  } catch (e) { return errorResponse(e) }
}
