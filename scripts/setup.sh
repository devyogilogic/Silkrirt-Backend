#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Silkriti — one-command EC2 bootstrap
#  Installs all deps, clones repos, writes .env files, builds, starts PM2,
#  configures Nginx and gets SSL certs. Run once on a fresh Ubuntu EC2.
#
#  Usage:
#    bash setup.sh
#
#  Or skip prompts by pre-exporting variables:
#    GITHUB_TOKEN=xxx MONGODB_URI="mongodb+srv://..." JWT_SECRET=xxx \
#    AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step()  { echo -e "\n${CYAN}▶  $*${NC}"; }
ok()    { echo -e "${GREEN}✔  $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠  $*${NC}"; }
abort() { echo -e "${RED}✗  $*${NC}"; exit 1; }

# ── 1. Collect secrets ────────────────────────────────────────────────────────
step "Collecting configuration (values are never stored in any file except .env)"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  read -rsp "  GitHub Personal Access Token: " GITHUB_TOKEN; echo
fi
[[ -z "${GITHUB_TOKEN:-}" ]] && abort "GitHub token is required"

if [[ -z "${MONGODB_URI:-}" ]]; then
  read -rp  "  MongoDB URI (mongodb+srv://...): " MONGODB_URI
fi
[[ -z "${MONGODB_URI:-}" ]] && abort "MongoDB URI is required"

if [[ -z "${JWT_SECRET:-}" ]]; then
  read -rsp "  JWT Secret (blank = auto-generate): " JWT_SECRET; echo
fi
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
  read -rp  "  AWS Access Key ID     (blank = skip S3): " AWS_ACCESS_KEY_ID
fi
if [[ -n "${AWS_ACCESS_KEY_ID:-}" && -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  read -rsp "  AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY; echo
fi

ADMIN_PASS="$(openssl rand -base64 12)"

ok "Configuration collected"

# ── 2. System packages ────────────────────────────────────────────────────────
step "Installing system packages"
sudo apt-get update  -y -qq
sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq nginx certbot python3-certbot-nginx

step "Installing Node.js 20 LTS"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null
sudo apt-get install -y -qq nodejs
ok "Node $(node -v)"

step "Installing PM2"
sudo npm install -g pm2 --silent
ok "PM2 $(pm2 -v)"

# ── 3. Clone repos ────────────────────────────────────────────────────────────
step "Cloning repositories"
BASE="https://oauth2:${GITHUB_TOKEN}@github.com/devyogilogic"

clone_or_pull() {
  local url=$1 dir=$2 name=$3
  if [[ -d "$dir/.git" ]]; then
    warn "$name already cloned — pulling latest"
    git -C "$dir" pull
  else
    git clone "$url" "$dir"
    ok "Cloned $name"
  fi
}

clone_or_pull "${BASE}/Silkrirt-Backend.git"      ~/silkriti-backend "backend"
clone_or_pull "${BASE}/Silkriti-Client-Side-.git" ~/silkriti-client  "client frontend"
clone_or_pull "${BASE}/Silkrirt-Frontend.git"     ~/silkriti-admin   "admin frontend"

# Store credentials so GitHub Actions CI workflows can git pull later
git config --global credential.helper store
printf "https://oauth2:%s@github.com\n" "$GITHUB_TOKEN" > ~/.git-credentials
chmod 600 ~/.git-credentials
ok "Git credentials stored (used by CI deploy workflows)"

# ── 4. Write .env files ───────────────────────────────────────────────────────
step "Writing .env files"

cat > ~/silkriti-backend/.env << EOF
PORT=5000
NODE_ENV=production

MONGODB_URI=${MONGODB_URI}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h

MAX_FILE_SIZE=1048576
UPLOAD_PATH=./uploads
MAX_FILES_PER_PRODUCT=5
SLUG_COLLISION_MODE=suffix
BLOG_MAX_FILE_SIZE=2097152

ADMIN_EMAIL=admin@silkriti.in
ADMIN_PASSWORD=${ADMIN_PASS}

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_BUCKET=s3-silkrirti
EOF

cat > ~/silkriti-client/.env.local << EOF
NEXT_PUBLIC_API_URL=https://api.silkriti.in/api
EOF

cat > ~/silkriti-admin/.env.local << EOF
NEXT_PUBLIC_API_URL=https://api.silkriti.in/api
EOF

chmod 600 ~/silkriti-backend/.env ~/silkriti-client/.env.local ~/silkriti-admin/.env.local
ok ".env files written and locked (chmod 600)"

# ── 5. Build ──────────────────────────────────────────────────────────────────
step "[1/3] Backend — installing dependencies and seeding DB"
cd ~/silkriti-backend
npm ci --omit=dev
npm run setup 2>/dev/null \
  && ok "Admin user seeded" \
  || warn "npm run setup returned non-zero — admin may already exist, continuing"

step "[2/3] Client frontend — installing and building"
cd ~/silkriti-client
npm ci
npm run build

step "[3/3] Admin frontend — installing and building"
cd ~/silkriti-admin
npm ci
npm run build

# ── 6. PM2 ────────────────────────────────────────────────────────────────────
step "Starting all processes with PM2"
cd ~/silkriti-backend
pm2 start ecosystem.config.js --env production
pm2 save

# Register PM2 to auto-start on reboot
PM2_STARTUP=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 | grep "sudo env")
[[ -n "$PM2_STARTUP" ]] && eval "$PM2_STARTUP" || warn "PM2 startup registration may need manual run"

ok "PM2 processes started"

# ── 7. Nginx ──────────────────────────────────────────────────────────────────
step "Configuring Nginx reverse proxy"
sudo systemctl enable nginx
sudo systemctl start nginx
sudo cp ~/silkriti-backend/nginx/*.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/silkriti.in.conf       /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/admin.silkriti.in.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.silkriti.in.conf   /etc/nginx/sites-enabled/
sudo rm -f  /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
ok "Nginx configured and reloaded"

# ── 8. SSL ────────────────────────────────────────────────────────────────────
step "Obtaining SSL certificates via Let's Encrypt"
warn "DNS A records for silkriti.in, admin.silkriti.in, api.silkriti.in must point here first"

if sudo certbot --nginx --non-interactive --agree-tos \
    --email admin@silkriti.in \
    -d silkriti.in -d www.silkriti.in \
    -d admin.silkriti.in \
    -d api.silkriti.in; then
  ok "SSL certificates issued — auto-renewal configured by Certbot"
else
  warn "Certbot failed — DNS may not be propagated yet."
  warn "Run manually once DNS is ready:"
  warn "  sudo certbot --nginx -d silkriti.in -d www.silkriti.in -d admin.silkriti.in -d api.silkriti.in"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Silkriti is live!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  https://silkriti.in"
echo "  https://admin.silkriti.in"
echo "  https://api.silkriti.in/api/health"
echo ""
echo "  Admin login:"
echo "  Email:    admin@silkriti.in"
echo "  Password: ${ADMIN_PASS}"
echo ""
echo "  ⚠ Save the password above — it won't be shown again"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
pm2 list
