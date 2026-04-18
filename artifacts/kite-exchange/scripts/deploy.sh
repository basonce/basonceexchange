#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# BASONCE Kite Exchange — safe deploy script
#
# Why this exists:
#   On 2026-04-18 a deploy silently shipped an empty bundle (wrong source dir)
#   and Cloudflare kept serving stale HTML referencing missing chunks. Customers
#   saw an infinite "Güncelleniyor..." spinner. This script makes that class of
#   failure impossible by:
#     1. Always building from the workspace package (single source of truth)
#     2. Always copying the CORRECT vite output dir (dist/public)
#     3. Verifying the staged bundle has index.html + /assets/index-*.js
#     4. Deploying via wrangler
#     5. Verifying the live site returns the freshly-built chunk hash
#
# Required env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# Usage:        bash artifacts/kite-exchange/scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_NAME="basonce"
LIVE_URL="https://basonce.com"
PKG="@workspace/kite-exchange"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SRC_DIR="$REPO_ROOT/artifacts/kite-exchange/dist/public"
WORKER_SRC="$REPO_ROOT/artifacts/kite-exchange/cf-worker/_worker.js"
STAGE_DIR="/tmp/basonce-deploy"

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
step()   { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }

fail() { red "✗ $*"; exit 1; }

# ── 0. Pre-flight ────────────────────────────────────────────────────────────
step "Pre-flight checks"
[ -n "${CLOUDFLARE_API_TOKEN:-}" ]   || fail "CLOUDFLARE_API_TOKEN is not set"
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]  || fail "CLOUDFLARE_ACCOUNT_ID is not set"
[ -f "$WORKER_SRC" ]                 || fail "Worker file missing: $WORKER_SRC"
green "✓ env + worker file ok"

# ── 1. Build ─────────────────────────────────────────────────────────────────
step "Building $PKG"
( cd "$REPO_ROOT" && pnpm --filter "$PKG" run build )

[ -d "$SRC_DIR" ]              || fail "Build output dir missing: $SRC_DIR"
[ -f "$SRC_DIR/index.html" ]   || fail "Build did not produce index.html"
[ -d "$SRC_DIR/assets" ]       || fail "Build did not produce assets/ dir"

# Pick the main entry chunk hash from the freshly-built HTML
BUILT_CHUNK=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' "$SRC_DIR/index.html" | head -1 || true)
[ -n "$BUILT_CHUNK" ] || fail "Could not find index chunk reference in built index.html"
[ -f "$SRC_DIR$BUILT_CHUNK" ]  || fail "Built HTML references $BUILT_CHUNK but the file does not exist on disk"
green "✓ build ok — main chunk: $BUILT_CHUNK"

# ── 2. Stage ─────────────────────────────────────────────────────────────────
step "Staging deploy bundle at $STAGE_DIR"
rm -rf "$STAGE_DIR"
cp -r "$SRC_DIR" "$STAGE_DIR"
cp "$WORKER_SRC" "$STAGE_DIR/_worker.js"

[ -f "$STAGE_DIR/index.html" ]    || fail "Stage missing index.html (cp failure?)"
[ -f "$STAGE_DIR/_worker.js" ]    || fail "Stage missing _worker.js"
[ -f "$STAGE_DIR$BUILT_CHUNK" ]   || fail "Stage missing $BUILT_CHUNK"
green "✓ staged $(find "$STAGE_DIR" -type f | wc -l) files"

# ── 3. Deploy ────────────────────────────────────────────────────────────────
step "Deploying to Cloudflare Pages ($PROJECT_NAME)"
DEPLOY_OUT=$(cd /tmp && npx wrangler@4 pages deploy basonce-deploy \
  --project-name="$PROJECT_NAME" \
  --commit-dirty=true \
  --branch=main 2>&1)
echo "$DEPLOY_OUT" | tail -8

DEPLOY_URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9]+\.basonce\.pages\.dev' | head -1)
[ -n "$DEPLOY_URL" ] || fail "Could not parse deployment URL from wrangler output"
green "✓ deployed: $DEPLOY_URL"

# ── 4. Verify deployment URL serves the same chunk we built ──────────────────
step "Verifying deployment URL serves built chunk"
sleep 3
DEPLOY_HTML=$(curl -sf "$DEPLOY_URL/" || true)
[ -n "$DEPLOY_HTML" ] || fail "Deployment URL returned empty body — bundle is broken"

DEPLOY_CHUNK=$(echo "$DEPLOY_HTML" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
[ "$DEPLOY_CHUNK" = "$BUILT_CHUNK" ] \
  || fail "Deploy URL serves chunk $DEPLOY_CHUNK but build produced $BUILT_CHUNK"

CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL$DEPLOY_CHUNK")
[ "$CHUNK_STATUS" = "200" ] \
  || fail "Deploy URL chunk returned HTTP $CHUNK_STATUS (expected 200)"
green "✓ deployment URL is healthy"

# ── 5. Verify live custom domain (basonce.com) ───────────────────────────────
step "Verifying live site $LIVE_URL"
LIVE_HEADERS=$(curl -sI "$LIVE_URL/?_cb=$RANDOM")
LIVE_CC=$(echo "$LIVE_HEADERS" | grep -i '^cache-control:' || true)
echo "$LIVE_CC" | grep -qi 'no-store' \
  || yellow "⚠ Live HTML cache-control is NOT no-store: $LIVE_CC (edge may still cache)"

LIVE_HTML=$(curl -sf "$LIVE_URL/?_cb=$RANDOM" || true)
[ -n "$LIVE_HTML" ] || fail "Live site returned empty body"

LIVE_CHUNK=$(echo "$LIVE_HTML" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
if [ "$LIVE_CHUNK" = "$BUILT_CHUNK" ]; then
  green "✓ live site already serving fresh chunk"
else
  yellow "⚠ Live site still serving $LIVE_CHUNK (expected $BUILT_CHUNK)"
  yellow "  This means Cloudflare edge cache is stale. Verifying chunk on origin…"
fi

# Whatever the live HTML references, the chunk MUST be reachable — otherwise
# users hit a ChunkLoadError and see the "Güncelleniyor..." spinner.
LIVE_CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$LIVE_URL$LIVE_CHUNK")
[ "$LIVE_CHUNK_STATUS" = "200" ] \
  || fail "Live site references $LIVE_CHUNK but it returns HTTP $LIVE_CHUNK_STATUS — customers will see infinite spinner!"
green "✓ live site chunks are reachable"

# ── 6. Done ──────────────────────────────────────────────────────────────────
step "Deploy complete"
green "✓ Built chunk:   $BUILT_CHUNK"
green "✓ Deploy URL:    $DEPLOY_URL"
green "✓ Live site:     $LIVE_URL"
echo
