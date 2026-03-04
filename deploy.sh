#!/usr/bin/env bash
# =============================================================================
# deploy.sh — First-time server setup for Gasstation (no domain, HTTP only)
# Run once on a fresh Ubuntu 22.04 VPS as root.
# =============================================================================
set -euo pipefail

echo "==> [1/5] Installing Docker..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> [2/5] Cloning repository..."
APP_DIR="/opt/gasstation"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull
else
  # Replace with your actual GitHub repo URL
  git clone https://github.com/Thilinapalkumbura/gasstation.git "$APP_DIR"
fi

cd "$APP_DIR"

echo "==> [3/5] Setting up .env..."
if [[ ! -f .env ]]; then
  cp .env.production.example .env
  echo ""
  echo "  !! .env created. Fill in your values now:"
  echo ""
  echo "     nano $APP_DIR/.env"
  echo ""
  echo "  Required changes:"
  echo "    CLIENT_URL=http://$(curl -s ifconfig.me)"
  echo "    POSTGRES_PASSWORD=<strong password>"
  echo "    REDIS_PASSWORD=<strong password>"
  echo "    JWT_ACCESS_SECRET=$(openssl rand -hex 64)"
  echo "    JWT_REFRESH_SECRET=$(openssl rand -hex 64)"
  echo ""
  echo "  After editing, run this script again: ./deploy.sh"
  exit 0
fi

echo "==> [4/5] Building and starting all services..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> [5/5] Running database migrations..."
echo "    Waiting for postgres to be ready..."
sleep 15
docker compose -f docker-compose.prod.yml exec api \
  sh -c "cd /app && npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma"

VPS_IP=$(curl -s ifconfig.me)
echo ""
echo "============================================================"
echo "  Gasstation is live at: http://$VPS_IP"
echo "============================================================"
echo ""
echo "  Useful commands:"
echo "    docker compose -f /opt/gasstation/docker-compose.prod.yml logs -f api"
echo "    docker compose -f /opt/gasstation/docker-compose.prod.yml logs -f web"
echo "    docker compose -f /opt/gasstation/docker-compose.prod.yml ps"
