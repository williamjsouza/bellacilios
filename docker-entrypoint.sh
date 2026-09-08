#!/bin/sh
set -e

mkdir -p /app/db
export DATABASE_URL="${DATABASE_URL:-file:/app/db/custom.db}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

if [ -f /app/node_modules/prisma/build/index.js ]; then
  echo "Aplicando schema Prisma..."
  node /app/node_modules/prisma/build/index.js db push --skip-generate --schema=/app/prisma/schema.prisma
fi

echo "Iniciando Next.js na porta ${PORT}..."
exec node /app/server.js
