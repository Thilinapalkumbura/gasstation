#!/usr/bin/env bash
# =============================================================================
# update.sh — Pull latest code and redeploy Gasstation
# Run from /opt/gasstation on your VPS.
# =============================================================================
set -euo pipefail

APP_DIR="/opt/gasstation"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull

echo "==> Rebuilding and restarting services..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Running DB migrations..."
sleep 8
docker compose -f docker-compose.prod.yml exec api \
  sh -c "cd /app && npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma"

echo ""
echo "==> Done. Running containers:"
docker compose -f docker-compose.prod.yml ps
