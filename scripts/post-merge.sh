#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Rebuild frontend bundles so the deployed static files are always up to date
echo "=== Building kite-exchange ==="
pnpm --filter @workspace/kite-exchange run build
echo "=== Building admin-monitor ==="
pnpm --filter @workspace/admin-monitor run build
echo "=== Frontend builds complete ==="
