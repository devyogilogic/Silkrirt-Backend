#!/usr/bin/env bash
# Initial build + PM2 start for all three apps.
# Run once after cloning all repos and creating .env files.
set -euo pipefail

echo "=== [1/4] Building Backend ==="
cd ~/silkriti-backend
npm ci --omit=dev

echo "=== [2/4] Building Client Frontend ==="
cd ~/silkriti-client
npm ci
npm run build

echo "=== [3/4] Building Admin Frontend ==="
cd ~/silkriti-admin
npm ci
npm run build

echo "=== [4/4] Starting all processes with PM2 ==="
cd ~/silkriti-backend
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "=== Done ==="
pm2 list
