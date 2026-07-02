#!/usr/bin/env bash
set -euo pipefail
cd /home/runner/workspace
pnpm --filter @workspace/kite-exchange run build
rm -rf /tmp/basonce-deploy
cp -r artifacts/kite-exchange/dist/public /tmp/basonce-deploy
cp artifacts/kite-exchange/cf-worker/_worker.js /tmp/basonce-deploy/_worker.js
grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' /tmp/basonce-deploy/index.html | head -1
echo BUILD_STAGE_DONE
