#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="哔哩哔哩账号备份"
APP_VERSION="2.1.6"
APP_BUNDLE="$ROOT_DIR/dist/macos/$APP_NAME.app"
DMG_DIR="$ROOT_DIR/dist/macos-dmg"
DMG_FILE="$DMG_DIR/$APP_NAME-$APP_VERSION.dmg"

"$ROOT_DIR/script/build_and_run.sh" --verify

rm -rf "$DMG_DIR"
mkdir -p "$DMG_DIR"
hdiutil create -volname "$APP_NAME" -srcfolder "$APP_BUNDLE" -ov -format UDZO "$DMG_FILE"
hdiutil verify "$DMG_FILE"

echo "$DMG_FILE"
