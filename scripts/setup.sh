#!/usr/bin/env bash
# One-time setup so a colleague can run ProLMS on THEIR computer (no shared Wi‑Fi needed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/4 Install packages"
npx pnpm@9.15.0 install

echo "==> 2/4 Start Postgres + MinIO (Docker)"
docker compose up -d

echo "==> 3/4 Create local env files (localhost — works on this machine)"
if [ ! -f apps/api/.env ]; then
  cp .env.example apps/api/.env
fi
# Force local-friendly media URL for browser demos on this machine
if grep -q 'S3_PUBLIC_URL=' apps/api/.env; then
  sed -i.bak 's|^S3_PUBLIC_URL=.*|S3_PUBLIC_URL="http://localhost:9000/lms-uploads"|' apps/api/.env
  rm -f apps/api/.env.bak
fi
if [ ! -f apps/mobile/.env ]; then
  cp apps/mobile/.env.example apps/mobile/.env
fi

echo "==> 4/4 Database schema + demo data"
cd apps/api
npx prisma generate
npx prisma db push --accept-data-loss
npx ts-node prisma/seed.ts
cd "$ROOT"

cat <<'EOF'

Setup complete.

Next (on this computer):
  npx pnpm@9.15.0 dev

Then open:
  Admin   http://localhost:5173/admin/     → admin@example.com
  Learner http://localhost:5174/app/      → learner@example.com

Mobile (optional):
  npx pnpm --filter @lms/mobile dev
  Simulator uses localhost. Real phone: put THIS Mac's Wi‑Fi IP in apps/mobile/.env

You do NOT need the original author's Wi‑Fi — everything runs locally.
EOF
