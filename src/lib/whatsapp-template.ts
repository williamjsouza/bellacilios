export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

export async function buildTemplateVars(clientId?: string, extra: Record<string, string> = {}) {
  const { db } = await import('@/lib/db')
  const vars: Record<string, string> = {
    empresa: 'Bella Lash Studio',
    brinde: '10%',
    desconto: '15%',
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    ...extra,
  }
  const nameSetting = await db.setting.findUnique({ where: { id: 'companyName' } })
  if (nameSetting) vars.empresa = nameSetting.value
  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId } })
    if (client) {
      vars.nome = client.socialName || client.name || 'cliente'
      vars.profissional = client.responsible ?? ''
    }
  }
  return vars
}
