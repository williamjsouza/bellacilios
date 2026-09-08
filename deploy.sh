#!/usr/bin/env bash
set -e

echo "========================================="
echo "🚀 Iniciando deploy - Bella Cílios ERP"
echo "========================================="

# 1. Atualizar código do Git
echo "📥 Atualizando código via Git..."
git pull origin main

# 2. Instalar dependências
echo "📦 Instalando dependências (npm)..."
npm install --production=false

# 3. Preparar banco de dados (Prisma)
echo "🗄️  Atualizando schema do Prisma..."
npx prisma generate
npx prisma db push --accept-data-loss

# 4. Build de produção do Next.js
echo "🏗️  Executando build do Next.js..."
npm run build

# 5. Reiniciar ou iniciar aplicação no PM2
echo "🔄 Atualizando processo no PM2..."
if command -v pm2 &> /dev/null; then
  pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
  pm2 save
  echo "✅ Aplicação atualizada no PM2 com sucesso!"
else
  echo "⚠️  Comando 'pm2' não encontrado no PATH global. Se estiver utilizando o Node Project Manager do aaPanel, reinicie a aplicação pela interface web do painel."
fi

echo "========================================="
echo "✨ Deploy concluído com sucesso!"
echo "========================================="
