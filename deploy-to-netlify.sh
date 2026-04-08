#!/bin/bash
# BASONCE → Netlify Deploy Script
# Kullanım: bash deploy-to-netlify.sh

set -e
echo "🚀 BASONCE Netlify Deploy başlıyor..."

# 1. Build
echo "📦 Build alınıyor..."
pnpm --filter @workspace/kite-exchange run build

# 2. _redirects (SPA routing)
echo "/* /index.html 200" > artifacts/kite-exchange/dist/public/_redirects

# 3. Zip
echo "🗜️  Zip oluşturuluyor..."
nix-shell -p zip --run "cd artifacts/kite-exchange/dist/public && zip -r /tmp/netlify-deploy.zip . -x '*.map'" 2>/dev/null

# 4. Deploy
echo "☁️  Netlify'a yükleniyor..."
RESULT=$(curl -s -X POST \
  "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary @/tmp/netlify-deploy.zip)

DEPLOY_ID=$(echo $RESULT | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d).id));")
echo "Deploy ID: $DEPLOY_ID"

# 5. Durum kontrol
sleep 10
STATE=$(curl -s \
  "https://api.netlify.com/api/v1/deploys/$DEPLOY_ID" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d).state));")

echo "✅ Deploy durumu: $STATE"
echo "🌐 Canlı: https://basonce.com"
