import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-hash'

const TECHNIQUES = [
  'Fio a Fio', 'Volume Brasileiro', 'Volume Russo', 'Volume Híbrido',
  'Volume Egípcio', 'Mega Volume', 'Fox Eyes', 'Cat Eyes', 'Doll Eyes',
  'Wet Effect', 'Kim K', 'Efeito Personalizado',
]

const EYE_EFFECTS = ['Natural', 'Clássico', 'Gatinho', 'Sereia', 'Aberto', 'Boneca']

const DEFAULT_TEMPLATES = [
  {
    key: 'agendamento',
    name: 'Confirmação de Agendamento',
    content: 'Olá, {{nome}}! Seu horário está agendado para {{data}} às {{hora}}, com {{profissional}}. Aguardamos você! — {{empresa}}',
  },
  {
    key: 'confirmacao',
    name: 'Confirmação de Atendimento',
    content: 'Olá, {{nome}}! Gostaríamos de confirmar seu atendimento do dia {{data}} às {{hora}}. Responda SIM para confirmar ou NÃO para reagendar.',
  },
  {
    key: 'lembrete',
    name: 'Lembrete de Atendimento',
    content: 'Olá, {{nome}}! Lembramos que seu atendimento será amanhã ({{data}}) às {{hora}}. Estamos te esperando! — {{empresa}}',
  },
  {
    key: 'aniversario',
    name: 'Aniversário',
    content: 'Parabéns, {{nome}}! A equipe {{empresa}} deseja um dia maravilhoso, cheio de beleza e brilho! 💖 Ganhe {{brinde}} de presente, é só agendar!',
  },
  {
    key: 'pos_atendimento',
    name: 'Pós-Atendimento',
    content: 'Olá, {{nome}}! Gostaríamos de saber como você está. Seu atendimento de {{servico}} ficou incrível? Conte pra gente! — {{empresa}}',
  },
  {
    key: 'manutencao',
    name: 'Manutenção de Cílios',
    content: 'Olá, {{nome}}! Está chegando o período recomendado para sua manutenção de cílios ({{data}}). Quer agendar? Responda aqui! — {{empresa}}',
  },
  {
    key: 'cliente_inativa',
    name: 'Cliente Inativa',
    content: 'Sentimos sua falta, {{nome}}! Já faz um tempo que você não vem nos visitar. Preparamos uma condição especial: {{desconto}} de desconto no próximo atendimento. Vamos marcar? — {{empresa}}',
  },
  {
    key: 'satisfacao',
    name: 'Pesquisa de Satisfação',
    content: 'Olá, {{nome}}! Como você avalia seu atendimento de {{servico}}? Responda de 1 a 5 estrelas. Sua opinião é muito importante! — {{empresa}}',
  },
]

const SETTINGS = {
  companyName: 'Bella Lash Studio',
  companyPhone: '(11) 99999-0000',
  companyAddress: 'Rua das Flores, 123 - São Paulo/SP',
  companyInstagram: '@bellalashstudio',
  whatsappProvider: 'evolution',
  whatsappApiUrl: '',
  whatsappApiKey: '',
  whatsappInstance: '',
  inactivityDays: '60',
  birthdayAdvance: '1',
}

export async function seedDatabase() {
  // Admin user
  const existing = await db.user.findUnique({ where: { email: 'admin@bella.com' } })
  if (!existing) {
    await db.user.create({
      data: {
        email: 'admin@bella.com',
        name: 'Administradora',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
      },
    })
  }

  // Other demo users
  const demoUsers = [
    { email: 'gestor@bella.com', name: 'Carla Gestora', role: 'gestor', pass: 'gestor123' },
    { email: 'recep@bella.com', name: 'Rita Recepção', role: 'recepcionista', pass: 'recep123' },
    { email: 'lash@bella.com', name: 'Larissa Lash', role: 'profissional', pass: 'lash123' },
    { email: 'fin@bella.com', name: 'Felipe Financeiro', role: 'financeiro', pass: 'fin123' },
  ]
  for (const u of demoUsers) {
    const e = await db.user.findUnique({ where: { email: u.email } })
    if (!e) {
      await db.user.create({
        data: { email: u.email, name: u.name, passwordHash: hashPassword(u.pass), role: u.role },
      })
    }
  }

  // Settings
  for (const [k, v] of Object.entries(SETTINGS)) {
    const s = await db.setting.findUnique({ where: { id: k } })
    if (!s) await db.setting.create({ data: { id: k, value: v as string } })
  }

  // Templates
  for (const t of DEFAULT_TEMPLATES) {
    const ex = await db.messageTemplate.findUnique({ where: { key: t.key } })
    if (!ex) await db.messageTemplate.create({ data: t })
  }

  // Service categories
  const catData = [
    { name: 'Cílios', icon: 'Eye', color: '#c084fc' },
    { name: 'Sobrancelhas', icon: 'Sparkles', color: '#f0abfc' },
    { name: 'Unhas', icon: 'Hand', color: '#f9a8d4' },
    { name: 'Estética Facial', icon: 'Flower2', color: '#fda4af' },
    { name: 'Estética Corporal', icon: 'Waves', color: '#fbbf24' },
    { name: 'Depilação', icon: 'Zap', color: '#a78bfa' },
  ]
  const cats: Record<string, string> = {}
  for (const c of catData) {
    let cat = await db.serviceCategory.findFirst({ where: { name: c.name } })
    if (!cat) cat = await db.serviceCategory.create({ data: c })
    cats[c.name] = cat.id
  }

  // Professionals
  const profData = [
    { name: 'Larissa Lash', role: 'Lash Designer', specialties: 'Cílios', color: '#c084fc', commission: 40, whatsapp: '5511999990001' },
    { name: 'Bianca Beauty', role: 'Lash & Brow', specialties: 'Cílios,Sobrancelhas', color: '#f0abfc', commission: 45, whatsapp: '5511999990002' },
    { name: 'Mila Nails', role: 'Nail Designer', specialties: 'Unhas', color: '#f9a8d4', commission: 50, whatsapp: '5511999990003' },
    { name: 'Duda Estética', role: 'Esteticista', specialties: 'Estética Facial,Estética Corporal', color: '#fda4af', commission: 38, whatsapp: '5511999990004' },
  ]
  const profs: Record<string, string> = {}
  for (const p of profData) {
    let prof = await db.professional.findFirst({ where: { name: p.name } })
    if (!prof) prof = await db.professional.create({ data: p })
    profs[p.name] = prof.id
  }

  // Services
  const serviceData = [
    { code: 'L001', name: 'Extensão de Cílios - Fio a Fio', cat: 'Cílios', duration: 120, price: 250, maintenanceDays: 21, profs: ['Larissa Lash','Bianca Beauty'] },
    { code: 'L002', name: 'Volume Brasileiro', cat: 'Cílios', duration: 150, price: 320, maintenanceDays: 21, profs: ['Larissa Lash','Bianca Beauty'] },
    { code: 'L003', name: 'Volume Russo', cat: 'Cílios', duration: 180, price: 380, maintenanceDays: 21, profs: ['Larissa Lash'] },
    { code: 'L004', name: 'Manutenção de Cílios', cat: 'Cílios', duration: 90, price: 150, maintenanceDays: 21, profs: ['Larissa Lash','Bianca Beauty'] },
    { code: 'L005', name: 'Remoção de Cílios', cat: 'Cílios', duration: 45, price: 60, profs: ['Larissa Lash','Bianca Beauty'] },
    { code: 'B001', name: 'Design de Sobrancelhas', cat: 'Sobrancelhas', duration: 45, price: 70, profs: ['Bianca Beauty'] },
    { code: 'B002', name: 'Henna de Sobrancelhas', cat: 'Sobrancelhas', duration: 60, price: 90, profs: ['Bianca Beauty'] },
    { code: 'U001', name: 'Manicure', cat: 'Unhas', duration: 60, price: 50, profs: ['Mila Nails'] },
    { code: 'U002', name: 'Pedicure', cat: 'Unhas', duration: 75, price: 65, profs: ['Mila Nails'] },
    { code: 'U003', name: 'Alongamento de Unhas', cat: 'Unhas', duration: 150, price: 220, profs: ['Mila Nails'] },
    { code: 'U004', name: 'Nail Designer Arte', cat: 'Unhas', duration: 120, price: 160, profs: ['Mila Nails'] },
    { code: 'E001', name: 'Limpeza de Pele', cat: 'Estética Facial', duration: 90, price: 180, profs: ['Duda Estética'] },
    { code: 'E002', name: 'Peeling Facial', cat: 'Estética Facial', duration: 60, price: 200, profs: ['Duda Estética'] },
    { code: 'E003', name: 'Massagem Modeladora', cat: 'Estética Corporal', duration: 60, price: 150, profs: ['Duda Estética'] },
    { code: 'E004', name: 'Drenagem Linfática', cat: 'Estética Corporal', duration: 60, price: 140, profs: ['Duda Estética'] },
    { code: 'D001', name: 'Depilação Cera Quente', cat: 'Depilação', duration: 45, price: 80, profs: ['Duda Estética'] },
  ]
  const svcMap: Record<string, string> = {}
  for (const s of serviceData) {
    let svc = await db.service.findFirst({ where: { code: s.code } })
    if (!svc) {
      svc = await db.service.create({
        data: {
          code: s.code, name: s.name, categoryId: cats[s.cat],
          duration: s.duration, price: s.price, commissionPct: 40,
          maintenanceDays: (s as any).maintenanceDays ?? null,
        },
      })
    }
    svcMap[s.code] = svc.id
    // link professionals
    for (const pn of s.profs) {
      const pid = profs[pn]
      if (pid) {
        const ex = await db.serviceProfessional.findFirst({ where: { serviceId: svc.id, professionalId: pid } })
        if (!ex) await db.serviceProfessional.create({ data: { serviceId: svc.id, professionalId: pid } })
      }
    }
  }

  // Techniques stored as settings
  const techSetting = await db.setting.findUnique({ where: { id: 'lash_techniques' } })
  if (!techSetting) await db.setting.create({ data: { id: 'lash_techniques', value: JSON.stringify(TECHNIQUES) } })
  const effSetting = await db.setting.findUnique({ where: { id: 'lash_effects' } })
  if (!effSetting) await db.setting.create({ data: { id: 'lash_effects', value: JSON.stringify(EYE_EFFECTS) } })

  // Product categories
  const prodCats = ['Colas', 'Fios', 'Acessórios', 'Produtos de Estética', 'EPIs', 'Consumíveis']
  const pcMap: Record<string, string> = {}
  for (const name of prodCats) {
    let pc = await db.productCategory.findFirst({ where: { name } })
    if (!pc) pc = await db.productCategory.create({ data: { name } })
    pcMap[name] = pc.id
  }

  // Supplier
  let sup = await db.supplier.findFirst({ where: { companyName: 'Lash Supply BR' } })
  if (!sup) sup = await db.supplier.create({ data: { companyName: 'Lash Supply BR', phone: '1133334444', whatsapp: '551133334444', email: 'vendas@lashsupply.com.br' } })

  // Products
  const prodData = [
    { name: 'Cola Premium 5g', cat: 'Colas', cost: 35, price: 0, stock: 20, min: 5, lot: 'L2026A', unit: 'un' },
    { name: 'Cola Hipotênica 3g', cat: 'Colas', cost: 45, price: 0, stock: 8, min: 5, lot: 'L2026B', unit: 'un' },
    { name: 'Fio Seda 0.07 C', cat: 'Fios', cost: 28, price: 0, stock: 50, min: 15, lot: 'F07C', unit: 'pct' },
    { name: 'Fio Seda 0.05 CC', cat: 'Fios', cost: 30, price: 0, stock: 40, min: 15, lot: 'F05CC', unit: 'pct' },
    { name: 'Fio Seda 0.10 D', cat: 'Fios', cost: 25, price: 0, stock: 12, min: 15, lot: 'F10D', unit: 'pct' },
    { name: 'Pads Protetores (par)', cat: 'Acessórios', cost: 0.5, price: 0, stock: 200, min: 50, unit: 'par' },
    { name: 'Escova Lash Cleaner', cat: 'Acessórios', cost: 1.2, price: 0, stock: 100, min: 30, unit: 'un' },
    { name: 'Primer 15ml', cat: 'Consumíveis', cost: 18, price: 0, stock: 15, min: 5, unit: 'un' },
    { name: 'Lash Cleaner 100ml', cat: 'Consumíveis', cost: 22, price: 0, stock: 18, min: 5, unit: 'un' },
    { name: 'Pó Estéril', cat: 'EPIs', cost: 8, price: 0, stock: 25, min: 10, unit: 'un' },
    { name: 'Luvas Nitrílicas (100)', cat: 'EPIs', cost: 35, price: 0, stock: 8, min: 5, unit: 'cx' },
    { name: 'Gel Pós-Cílios', cat: 'Produtos de Estética', cost: 15, price: 45, stock: 30, min: 10, unit: 'un' },
  ]
  const prodMap: Record<string, string> = {}
  for (const p of prodData) {
    let prod = await db.product.findFirst({ where: { name: p.name } })
    if (!prod) {
      prod = await db.product.create({
        data: {
          name: p.name, categoryId: pcMap[p.cat], supplierId: sup.id,
          cost: p.cost, price: p.price, stock: p.stock, minStock: p.min,
          lot: (p as any).lot ?? null, unit: p.unit,
        },
      })
    }
    prodMap[p.name] = prod.id
  }

  // Ficha técnica (consumo) para serviço de Volume Brasileiro
  const vb = svcMap['L002']
  if (vb) {
    const consumptions = [
      { product: 'Cola Premium 5g', qty: 0.1 }, // 0.1 unidade (~0.5g)
      { product: 'Pads Protetores (par)', qty: 1 },
      { product: 'Escova Lash Cleaner', qty: 1 },
      { product: 'Fio Seda 0.07 C', qty: 1 },
      { product: 'Primer 15ml', qty: 0.05 },
    ]
    for (const c of consumptions) {
      const pid = prodMap[c.product]
      if (pid) {
        const ex = await db.serviceProductConsumption.findFirst({ where: { serviceId: vb, productId: pid } })
        if (!ex) await db.serviceProductConsumption.create({ data: { serviceId: vb, productId: pid, quantity: c.qty } })
      }
    }
  }

  // Demo clients
  const today = new Date()
  const clientData = [
    { name: 'Ana Beatriz Silva', socialName: 'Ana', phone: '11988880001', whatsapp: '5511988880001', email: 'ana@email.com', birthDate: '1992-05-12', source: 'Instagram', classification: 'Frequente', city: 'São Paulo', eyeShape: 'Aveludados', lashType: 'Reto', lashThickness: 'Fino', lashCurvature: 'C', lashDensity: 'Média', lashLength: 'Médio' },
    { name: 'Bruna Costa Lima', socialName: 'Bru', phone: '11988880002', whatsapp: '5511988880002', email: 'bruna@email.com', birthDate: '1988-11-23', source: 'Indicação', classification: 'VIP', city: 'São Paulo', eyeShape: 'Puxados', lashType: 'Cacheado', lashThickness: 'Médio', lashCurvature: 'CC', lashDensity: 'Alta', lashLength: 'Longo' },
    { name: 'Carla Mendes Rocha', socialName: 'Carla', phone: '11988880003', whatsapp: '5511988880003', birthDate: '1995-02-08', source: 'Google', classification: 'Ativa', city: 'Guarulhos', eyeShape: 'Caídos', lashType: 'Reto', lashThickness: 'Grosso', lashCurvature: 'D', lashDensity: 'Baixa', lashLength: 'Curto' },
    { name: 'Daniela Souza', socialName: 'Dani', phone: '11988880004', whatsapp: '5511988880004', birthDate: '2000-07-30', source: 'Passagem', classification: 'Nova', city: 'São Paulo' },
    { name: 'Eduarda Fernandes', socialName: 'Duda', phone: '11988880005', whatsapp: '5511988880005', birthDate: '1985-09-14', source: 'Indicação', classification: 'Inativa', city: 'Osasco' },
    { name: 'Fernanda Alves', socialName: 'Fer', phone: '11988880006', whatsapp: '5511988880006', birthDate: '1998-03-21', source: 'Instagram', classification: 'Frequente', city: 'São Paulo', eyeShape: 'Grandes', lashType: 'Reto', lashThickness: 'Fino', lashCurvature: 'CC', lashDensity: 'Média', lashLength: 'Médio' },
  ]
  const clientIds: string[] = []
  for (const c of clientData) {
    let cl = await db.client.findFirst({ where: { name: c.name } })
    if (!cl) {
      cl = await db.client.create({
        data: {
          ...c,
          birthDate: c.birthDate ? new Date(c.birthDate) : null,
          responsible: 'Larissa Lash',
        } as any,
      })
    }
    clientIds.push(cl.id)
  }

  // Appointments for today and upcoming
  const makeAppt = async (clientIdx: number, profName: string, svcCode: string, dayOffset: number, start: string, status: string) => {
    const clientId = clientIds[clientIdx]
    if (!clientId) return
    const profId = profs[profName]
    const serviceId = svcMap[svcCode]
    if (!profId || !serviceId) return
    const svc = await db.service.findUnique({ where: { id: serviceId } })
    if (!svc) return
    const date = new Date(today)
    date.setDate(date.getDate() + dayOffset)
    date.setHours(0, 0, 0, 0)
    const [h, m] = start.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + svc.duration
    const eh = String(Math.floor(endMin / 60)).padStart(2, '0')
    const em = String(endMin % 60).padStart(2, '0')
    const existing = await db.appointment.findFirst({
      where: { clientId, professionalId: profId, date, startTime: start },
    })
    if (!existing) {
      await db.appointment.create({
        data: {
          clientId, professionalId: profId, serviceId, date,
          startTime: start, endTime: `${eh}:${em}`, duration: svc.duration,
          price: svc.price, status,
        },
      })
    }
  }
  await makeAppt(0, 'Larissa Lash', 'L004', 0, '09:00', 'confirmado')
  await makeAppt(1, 'Larissa Lash', 'L002', 0, '11:00', 'confirmado')
  await makeAppt(2, 'Larissa Lash', 'L001', 0, '14:00', 'agendado')
  await makeAppt(5, 'Bianca Beauty', 'L004', 0, '10:00', 'confirmado')
  await makeAppt(3, 'Mila Nails', 'U003', 0, '13:00', 'agendado')
  await makeAppt(4, 'Duda Estética', 'E001', 0, '15:00', 'confirmado')
  await makeAppt(0, 'Larissa Lash', 'L001', 1, '09:00', 'agendado')
  await makeAppt(2, 'Bianca Beauty', 'L002', 1, '10:00', 'agendado')
  await makeAppt(3, 'Mila Nails', 'U001', 2, '11:00', 'agendado')

  // Procedures (atendimentos finalizados) para gerar histórico e manutenções
  const mkProc = async (clientIdx: number, profName: string, svcCode: string, daysAgo: number, extra: any = {}) => {
    const clientId = clientIds[clientIdx]
    if (!clientId) return
    const profId = profs[profName]
    const serviceId = svcMap[svcCode]
    if (!profId || !serviceId) return
    const svc = await db.service.findUnique({ where: { id: serviceId } })
    if (!svc) return
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    const nextDays = svc.maintenanceDays ?? 21
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + nextDays)
    await db.procedure.create({
      data: {
        clientId, professionalId: profId, serviceId, date,
        technique: extra.technique ?? 'Volume Brasileiro',
        curvature: extra.curvature ?? 'CC',
        thickness: extra.thickness ?? '0.07',
        lengths: extra.lengths ?? '8|9|10|11|12|11|10|9',
        effect: extra.effect ?? 'Gatinho',
        glue: 'Cola Premium 5g',
        glueLot: 'L2026A',
        duration: svc.duration,
        nextMaintenance: nextDate,
        nextMaintenanceDays: nextDays,
        satisfaction: extra.satisfaction ?? 5,
        ...extra.fields,
      },
    })
  }
  // Cliente Ana: procedimento há 25 dias (manutenção vencida)
  await mkProc(0, 'Larissa Lash', 'L002', 25, { technique: 'Volume Russo', effect: 'Boneca', curvature: 'D', thickness: '0.05', lengths: '9|10|11|12|13|12|11|10' })
  // Cliente Bruna: procedimento há 18 dias (manutenção próxima)
  await mkProc(1, 'Larissa Lash', 'L002', 18, { technique: 'Mega Volume', effect: 'Sereia', curvature: 'CC', thickness: '0.07', lengths: '8|9|10|11|12|11|10|9' })
  // Cliente Fernanda: procedimento há 10 dias (ok)
  await mkProc(5, 'Bianca Beauty', 'L001', 10, { technique: 'Fio a Fio', effect: 'Natural', curvature: 'C', thickness: '0.10', lengths: '8|9|10|11|11|10|9|8' })
  // Cliente Carla: procedimento há 5 dias
  await mkProc(2, 'Bianca Beauty', 'L004', 5, { technique: 'Fio a Fio', effect: 'Clássico', curvature: 'C', thickness: '0.10', lengths: '9|10|11|11|10|9' })

  // Lash mapping default para Ana
  if (clientIds[0]) {
    const ex = await db.lashMapping.findFirst({ where: { clientId: clientIds[0], isDefault: true } })
    if (!ex) {
      await db.lashMapping.create({
        data: {
          clientId: clientIds[0], name: 'Padrão Ana',
          leftEye: JSON.stringify(['8','9','10','11','12','11','10','9']),
          rightEye: JSON.stringify(['9','10','11','12','11','10','9','8']),
          curvature: 'CC', thickness: '0.07', technique: 'Volume Russo', effect: 'Boneca', isDefault: true,
        },
      })
    }
  }

  // Accounts payable demo
  const apData = [
    { description: 'Aluguel do Studio', category: 'aluguel', amount: 3500, dueIn: 5 },
    { description: 'Conta de Energia', category: 'energia', amount: 480, dueIn: 2 },
    { description: 'Internet', category: 'energia', amount: 120, dueIn: 8 },
    { description: 'Compra Lash Supply', category: 'produtos', amount: 850, dueIn: -3 },
  ]
  for (const a of apData) {
    const due = new Date(today); due.setDate(due.getDate() + a.dueIn)
    const ex = await db.accountPayable.findFirst({ where: { description: a.description } })
    if (!ex) await db.accountPayable.create({ data: { description: a.description, category: a.category, amount: a.amount, dueDate: due, supplierId: sup.id, status: a.dueIn < 0 ? 'aberta' : 'aberta' } })
  }

  return { ok: true, message: 'Seed concluído' }
}
