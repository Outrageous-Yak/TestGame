#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
  docker compose up --build
elif command -v docker-compose &>/dev/null; then
  docker-compose up --build
else
  echo "Docker not found. Running locally..."
  pip install -q -r requirements-pwa.txt
  python scripts/generate_icons.py || true
  if [ ! -d web/dist ]; then
    (cd web && npm install && npm run build)
  fi
  export WEB_DIST="$ROOT/web/dist"
  exec uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
fi
