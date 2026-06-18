#!/bin/bash

# ==============================================================
# Week Number — build & package script
# Runs the Vite/CRXJS build (→ dist/) then zips dist/ into per-store
# packages with manifest.json at the ZIP root.
#
#   ./build.sh            # build + zip all targets (chrome edge)
#   ./build.sh chrome     # build + zip only Chrome
# ==============================================================

set -e

VERSION=$(node -p "require('./manifest.json').version")
NAME="week-number"
BUILD_ROOT="build"
BROWSERS=("chrome" "edge")

if [ -n "$1" ]; then
    BROWSERS=("$@")
fi

echo "🔧 Building ${NAME} v${VERSION} via Vite/CRXJS"
echo "🌐 Targets: ${BROWSERS[*]}"

rm -rf "$BUILD_ROOT" dist

# Produce the bundled extension in dist/ (manifest.json lands at dist root).
npx --no-install vite build

if [ ! -f dist/manifest.json ]; then
    echo "❌ Vite build did not produce dist/manifest.json"
    exit 1
fi

# One MV3 build serves both stores — zip dist/ into each target package.
for BROWSER in "${BROWSERS[@]}"; do
    ZIP_PATH="$BUILD_ROOT/$BROWSER/${NAME}-v${VERSION}-${BROWSER}.zip"
    mkdir -p "$BUILD_ROOT/$BROWSER"
    ( cd dist && zip -r -q -X "../$ZIP_PATH" . )
    SIZE=$(du -h "$ZIP_PATH" | cut -f1)
    echo "📦 ${BROWSER}: $ZIP_PATH (${SIZE})"
done

echo "✅ Build complete."
