#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Patitas en Alerta — script de inicialización del proyecto
# Uso: bash scripts/setup.sh
# Requiere: Node.js 20+, npm, Docker (opcional pero recomendado), git
# ============================================================

command -v node >/dev/null 2>&1 || { echo "❌ Falta Node.js 20+. Instalalo antes de continuar."; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ Falta npm."; exit 1; }

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Se requiere Node.js 20 o superior (actual: $(node -v))."
  exit 1
fi

echo "📦 1/6 — Instalando dependencias..."
npm install

echo "🔐 2/6 — Preparando variables de entorno..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  → Se creó .env.local a partir de .env.example."
  echo "  → COMPLETAR manualmente: claves de Supabase, Cloudinary y Upstash antes de continuar."
else
  echo "  → .env.local ya existe, no se sobreescribe."
fi

echo "🐘 3/6 — Levantando Postgres local con pgvector (Docker)..."
if command -v docker >/dev/null 2>&1; then
  docker compose up -d db
  echo "  → Esperando que la base de datos esté lista..."
  until docker compose exec -T db pg_isready -U patitas -d patitas_en_alerta >/dev/null 2>&1; do
    sleep 1
  done
  echo "  → Postgres (pgvector) arriba en localhost:5432."
else
  echo "  ⚠️  Docker no detectado. Si vas a usar Supabase cloud en vez de Postgres local,"
  echo "     asegurate de que DATABASE_URL en .env.local apunte a tu proyecto de Supabase."
fi

echo "🧬 4/6 — Generando cliente de Prisma..."
npx prisma generate

echo "🗄️  5/6 — Aplicando el esquema inicial (si hay migraciones pendientes)..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "  → No hay migraciones todavía."
  echo "  → Ver docs/SETUP.md paso 6 para crear la primera migración a partir de docs/SCHEMA.md."
fi

echo "🪝 6/6 — Configurando hooks de git (Husky)..."
npx husky install

echo ""
echo "✅ Proyecto listo."
echo ""
echo "Próximos pasos:"
echo "  1) Completar .env.local con las claves reales (Supabase, Cloudinary, Upstash)."
echo "  2) Revisar docs/SETUP.md → 'Configuración manual pendiente' (GitHub, Supabase, Auth)."
echo "  3) npm run dev"
