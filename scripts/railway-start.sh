#!/usr/bin/env sh
set -e

case "${RAILWAY_SERVICE_NAME:-nexus-api}" in
  nexus-web)
    cd nexasos
    npm run build
    npm start
    ;;
  *)
    cd backend
    npm start
    ;;
esac
