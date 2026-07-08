#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SVG="$ROOT_DIR/src/renderer/assets/images/icon.svg"
BUILD_DIR="$ROOT_DIR/build"
ICONSET="$BUILD_DIR/icon-mac.iconset"
BASE_PNG="$BUILD_DIR/icon-mac-1024.png"
ICNS="$BUILD_DIR/icon-mac.icns"

rm -rf "$ICONSET"
mkdir -p "$BUILD_DIR" "$ICONSET"

qlmanage -t -s 1024 -o "$BUILD_DIR" "$SRC_SVG" >/dev/null
mv "$BUILD_DIR/$(basename "$SRC_SVG").png" "$BASE_PNG"

sips -z 16 16 "$BASE_PNG" --out "$ICONSET/icon_16x16.png" >/dev/null
sips -z 32 32 "$BASE_PNG" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$BASE_PNG" --out "$ICONSET/icon_32x32.png" >/dev/null
sips -z 64 64 "$BASE_PNG" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$BASE_PNG" --out "$ICONSET/icon_128x128.png" >/dev/null
sips -z 256 256 "$BASE_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$BASE_PNG" --out "$ICONSET/icon_256x256.png" >/dev/null
sips -z 512 512 "$BASE_PNG" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$BASE_PNG" --out "$ICONSET/icon_512x512.png" >/dev/null
cp "$BASE_PNG" "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$ICNS"
cp "$BASE_PNG" "$BUILD_DIR/icon-mac.png"

echo "$ICNS"
