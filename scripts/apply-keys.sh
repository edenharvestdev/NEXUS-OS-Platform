#!/usr/bin/env bash
# Apply API keys from arguments or env file
# Usage:
#   ./scripts/apply-keys.sh GEMINI=AIza... ANTHROPIC=sk-ant-...
#   ./scripts/apply-keys.sh --file backend/.env.keys
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV="$ROOT/backend/.env"
FRONT="$ROOT/nexasos/.env.local"

set_kv() {
  local file="$1" key="$2" val="$3"
  [ -z "$val" ] && return
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${val}|" "$file"
    fi
  else
    echo "${key}=${val}" >> "$file"
  fi
}

if [ "${1:-}" = "--file" ] && [ -n "${2:-}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$2"
  set +a
fi

for arg in "$@"; do
  case "$arg" in
    --file=*) ;; 
    --file) ;;
    GEMINI=*) set_kv "$ENV" GEMINI_API_KEY "${arg#GEMINI=}" ;;
    ANTHROPIC=*) set_kv "$ENV" ANTHROPIC_API_KEY "${arg#ANTHROPIC=}" ;;
    OPENAI=*) set_kv "$ENV" OPENAI_API_KEY "${arg#OPENAI=}" ;;
    TYPHOON=*) set_kv "$ENV" TYPHOON_API_KEY "${arg#TYPHOON=}" ;;
    RESEND=*) set_kv "$ENV" RESEND_API_KEY "${arg#RESEND=}" ;;
    LINE_SECRET=*) set_kv "$ENV" LINE_CHANNEL_SECRET "${arg#LINE_SECRET=}" ;;
    LINE_TOKEN=*) set_kv "$ENV" LINE_CHANNEL_ACCESS_TOKEN "${arg#LINE_TOKEN=}" ;;
  esac
done

# Mirror to frontend
for key in ANTHROPIC_API_KEY TYPHOON_API_KEY; do
  val=$(grep -E "^${key}=" "$ENV" | cut -d= -f2- || true)
  [ -n "$val" ] && set_kv "$FRONT" "$key" "$val"
done

echo "✅ Keys applied to backend/.env (+ frontend mirror where needed)"
echo "   Restart: npm run dev"
