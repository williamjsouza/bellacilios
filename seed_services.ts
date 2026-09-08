import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Lash Services...')

  const category = await prisma.serviceCategory.create({
    data: {
      name: 'Extensão de Cílios',
      icon: 'Eye',
      color: 'pink',
    }
  })

  const services = [
    { name: 'Fio a Fio Clássico', desc: 'Técnica tradicional fio a fio para efeito natural.', duration: 120, price: 160, maint: 90, maintDays: 15 },
    { name: 'Volume Brasileiro (Y)', desc: 'Fios em Y, entrega volume marcante e leveza.', duration: 120, price: 190, maint: 110, maintDays: 15 },
    { name: 'Volume Egípcio (W)', desc: 'Fios em W, textura densa e volumosa.', duration: 120, price: 200, maint: 120, maintDays: 15 },
    { name: 'Volume Híbrido', desc: 'Mistura do Fio a Fio com Volume Russo.', duration: 150, price: 210, maint: 120, maintDays: 20 },
    { name: 'Volume Russo', desc: 'Fans de 3D a 7D para máximo volume e impacto.', duration: 180, price: 260, maint: 160, maintDays: 20 },
    { name: 'Mega Volume', desc: 'Fans acima de 8D, super preenchimento e drama.', duration: 180, price: 320, maint: 200, maintDays: 25 },
    { name: 'Efeito Sirena / Fox Eyes', desc: 'Fios alongados no canto externo para efeito gatinho.', duration: 150, price: 230, maint: 140, maintDays: 20 },
    { name: 'Lash Lifting + Tintura', desc: 'Curvatura e coloração natural dos próprios fios.', duration: 90, price: 160, maint: 0, maintDays: 0 },
    { name: 'Remoção de Extensão', desc: 'Remoção segura dos cílios artificiais.', duration: 30, price: 50, maint: 0, maintDays: 0 },
  ]

  for (const s of services) {
    const srv = await prisma.service.create({
      data: {
        name: s.name,
        description: s.desc,
        duration: s.duration,
        price: s.price,
        categoryId: category.id,
        maintenanceDays: s.maintDays > 0 ? s.maintDays : null,
      }
    })
    
    // Add default price (Normal)
    await prisma.servicePrice.create({
      data: {
        serviceId: srv.id,
        tableName: 'Tabela Padrão',
        price: s.price
      }
    })

    // If there's a maintenance price, create a virtual service or another price entry?
    // Usually maintenance is a separate service. Let's create it as a separate service for ease of scheduling.
    if (s.maint > 0) {
      const maintSrv = await prisma.service.create({
        data: {
          name: `Manutenção - ${s.name}`,
          description: `Manutenção até ${s.maintDays} dias`,
          duration: Math.floor(s.duration * 0.75),
          price: s.maint,
          categoryId: category.id,
        }
      })
      await prisma.servicePrice.create({
        data: {
          serviceId: maintSrv.id,
          tableName: 'Tabela Padrão',
          price: s.maint
        }
      })
    }
  }

  console.log('Services seeded successfully!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
