#!/usr/bin/env bash
# NEXUS OS — local PostgreSQL setup (แยก table ตามฝั่ง Tamada / SDX / Franchise)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-docker}"

echo "🗄️  NEXUS OS Database Setup"
echo ""

if [ "$MODE" = "docker" ]; then
  echo "▶ Starting PostgreSQL via Docker Compose..."
  docker compose up -d postgres
  echo "   Waiting for postgres..."
  until docker compose exec -T postgres pg_isready -U nexus -d nexasos >/dev/null 2>&1; do sleep 1; done
  echo "✅ PostgreSQL ready at postgres://nexus:nexus@localhost:5432/nexasos"
  echo ""
  echo "Next steps:"
  echo "  1. cp backend/.env.example backend/.env"
  echo "  2. Add to backend/.env:"
  echo "     DATABASE_URL=postgres://nexus:nexus@localhost:5432/nexasos"
  echo "  3. npm run dev:backend   (schema auto-created on startup)"
  echo "  4. Sign up at http://localhost:3000/login"
  echo "  5. POST /api/tamada/seed — seed entities, branches, dictionary"
elif [ "$MODE" = "sqlite" ]; then
  echo "▶ SQLite mode — no Docker needed"
  echo "   Leave DATABASE_URL empty in backend/.env"
  echo "   DB file: backend/data/nexasos.db (created on first API start)"
  echo ""
  echo "  npm run dev:backend"
else
  echo "Usage: $0 [docker|sqlite]"
  exit 1
fi
