#!/usr/bin/env sh
set -e

npm run install:all

case "${RAILWAY_SERVICE_NAME:-nexus-api}" in
  nexus-web)
    npm run build:frontend
    ;;
  *)
    npm run build:backend
    ;;
esac
