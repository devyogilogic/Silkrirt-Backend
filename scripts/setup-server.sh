#!/usr/bin/env bash
# One-time EC2 setup: Node.js 20, PM2, Nginx, Certbot
# Run as: bash scripts/setup-server.sh
set -euo pipefail

echo "=== Silkriti EC2 Setup ==="

sudo apt-get update -y
sudo apt-get upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx + Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# PM2 auto-start on reboot
env PATH="$PATH:/usr/bin" pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

echo ""
echo "=== Setup complete. Next steps: ==="
echo ""
echo "1. Clone all three repos:"
echo "   git clone git@github.com:<org>/silkriti-backend.git ~/silkriti-backend"
echo "   git clone git@github.com:<org>/silkriti-client.git  ~/silkriti-client"
echo "   git clone git@github.com:<org>/silkriti-admin.git   ~/silkriti-admin"
echo ""
echo "2. Create .env files (never commit these):"
echo "   ~/silkriti-backend/.env"
echo "   ~/silkriti-client/.env.local    → NEXT_PUBLIC_API_URL=https://api.silkriti.in/api"
echo "   ~/silkriti-admin/.env.local     → NEXT_PUBLIC_API_URL=https://api.silkriti.in/api"
echo ""
echo "3. Run first deploy:"
echo "   bash ~/silkriti-backend/scripts/first-deploy.sh"
echo ""
echo "4. Install Nginx configs:"
echo "   sudo cp ~/silkriti-backend/nginx/*.conf /etc/nginx/sites-available/"
echo "   sudo ln -sf /etc/nginx/sites-available/silkriti.in.conf       /etc/nginx/sites-enabled/"
echo "   sudo ln -sf /etc/nginx/sites-available/admin.silkriti.in.conf /etc/nginx/sites-enabled/"
echo "   sudo ln -sf /etc/nginx/sites-available/api.silkriti.in.conf   /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "5. Obtain SSL (DNS must point here first):"
echo "   sudo certbot --nginx -d silkriti.in -d www.silkriti.in -d admin.silkriti.in -d api.silkriti.in"
