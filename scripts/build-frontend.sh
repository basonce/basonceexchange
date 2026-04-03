#!/bin/bash
set -e

echo "=== Building kite-exchange frontend ==="
cd "$(dirname "$0")/.."

pnpm --filter @workspace/kite-exchange run build
echo "✅ kite-exchange built"

echo "=== Building admin-monitor frontend ==="
pnpm --filter @workspace/admin-monitor run build
echo "✅ admin-monitor built"

echo "=== All frontends built successfully ==="
