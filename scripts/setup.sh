#!/usr/bin/env bash
# NEXUS OS — one-shot local setup
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "📦 Installing dependencies..."
npm run install:all

echo "🔨 Building..."
npm run build:backend
npm run build:frontend

echo "🧪 Backend tests..."
cd backend && npm test && cd ..

# Sync AI keys backend → frontend (if set)
if [ -f backend/.env ] && [ -f nexasos/.env.local ]; then
  for key in GEMINI_API_KEY ANTHROPIC_API_KEY OPENAI_API_KEY TYPHOON_API_KEY RESEND_API_KEY; do
    val=$(grep -E "^${key}=" backend/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
    [ -n "$val" ] && grep -q "^${key}=" nexasos/.env.local 2>/dev/null && \
      sed -i '' "s|^${key}=.*|${key}=${val}|" nexasos/.env.local 2>/dev/null || true
  done
  for key in ANTHROPIC_API_KEY TYPHOON_API_KEY; do
    val=$(grep -E "^${key}=" backend/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
    if [ -n "$val" ]; then
      if grep -q "^${key}=" nexasos/.env.local; then
        sed -i '' "s|^${key}=.*|${key}=${val}|" nexasos/.env.local
      else
        echo "${key}=${val}" >> nexasos/.env.local
      fi
    fi
  done
fi

echo ""
echo "✅ Setup complete"
echo "   1. ใส่ API keys ใน backend/.env"
echo "   2. npm run dev"
echo "   3. เปิด http://localhost:3000/login → สมัครองค์กร"
echo "   4. ตรวจ http://localhost:4000/health/deep"
