#!/bin/sh
set -e

mkdir -p /app/db
export DATABASE_URL="${DATABASE_URL:-file:/app/db/custom.db}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

if [ -d "/app/node_modules/prisma" ]; then
  echo "Aplicando schema Prisma..."
  npx prisma db push --skip-generate --schema=/app/prisma/schema.prisma
fi

echo "Iniciando Next.js na porta ${PORT}..."
exec node /app/server.js
