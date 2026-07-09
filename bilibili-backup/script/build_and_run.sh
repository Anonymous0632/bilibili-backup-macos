#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_DISPLAY_NAME="哔哩哔哩账号备份"
LAUNCHER_NAME="bilibili-backup"
WRAPPER_NAME="bilibili-backup-launcher"
APP_VERSION="2.1.6"
BUNDLE_ID="io.github.hzhilong.bilibili.backup"
MAIN_CLASS="io.github.hzhilong.bilibili.backup.App"
MAIN_JAR="bilibili-backup-${APP_VERSION}.jar"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$ROOT_DIR/target"
INPUT_DIR="$TARGET_DIR/jpackage-input"
DIST_DIR="$ROOT_DIR/dist/macos"
APP_BUNDLE="$DIST_DIR/$APP_DISPLAY_NAME.app"
JPACKAGE_APP_BUNDLE="$DIST_DIR/$LAUNCHER_NAME.app"
ICON_SOURCE="$ROOT_DIR/assets/doc/app_logo2.png"
ICONSET_DIR="$TARGET_DIR/macos-icon.iconset"
ICON_FILE="$TARGET_DIR/app_logo.icns"
M2_REPO="${M2_REPO:-$HOME/.m2/repository}"

if [[ -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 1
  fi
}

stop_app() {
  pkill -x "$LAUNCHER_NAME" >/dev/null 2>&1 || true
  pkill -f "$APP_BUNDLE/Contents/MacOS/$LAUNCHER_NAME" >/dev/null 2>&1 || true
}

copy_dep() {
  local rel="$1"
  local jar="$M2_REPO/$rel"
  if [[ ! -f "$jar" ]]; then
    echo "Missing dependency jar: $jar" >&2
    echo "Run: mvn -DskipTests compile" >&2
    exit 1
  fi
  cp "$jar" "$INPUT_DIR/"
}

build_app() {
  require_tool mvn
  require_tool jpackage
  require_tool sips
  require_tool iconutil

  (cd "$ROOT_DIR" && mvn -DskipTests compile jar:jar)

  rm -rf "$INPUT_DIR" "$ICONSET_DIR" "$DIST_DIR"
  mkdir -p "$INPUT_DIR" "$ICONSET_DIR" "$DIST_DIR"
  cp "$TARGET_DIR/$MAIN_JAR" "$INPUT_DIR/"

  copy_dep "ch/qos/reload4j/reload4j/1.2.22/reload4j-1.2.22.jar"
  copy_dep "com/alibaba/fastjson/1.2.83/fastjson-1.2.83.jar"
  copy_dep "com/formdev/flatlaf-extras/3.5.2/flatlaf-extras-3.5.2.jar"
  copy_dep "com/formdev/flatlaf-intellij-themes/3.5.2/flatlaf-intellij-themes-3.5.2.jar"
  copy_dep "com/formdev/flatlaf/3.5.2/flatlaf-3.5.2.jar"
  copy_dep "com/github/weisj/jsvg/1.4.0/jsvg-1.4.0.jar"
  copy_dep "com/google/code/findbugs/jsr305/3.0.2/jsr305-3.0.2.jar"
  copy_dep "com/google/code/gson/gson/2.8.9/gson-2.8.9.jar"
  copy_dep "com/google/errorprone/error_prone_annotations/2.18.0/error_prone_annotations-2.18.0.jar"
  copy_dep "com/google/guava/failureaccess/1.0.1/failureaccess-1.0.1.jar"
  copy_dep "com/google/guava/guava/32.0.1-jre/guava-32.0.1-jre.jar"
  copy_dep "com/google/guava/listenablefuture/9999.0-empty-to-avoid-conflict-with-guava/listenablefuture-9999.0-empty-to-avoid-conflict-with-guava.jar"
  copy_dep "com/google/j2objc/j2objc-annotations/2.8/j2objc-annotations-2.8.jar"
  copy_dep "com/google/protobuf/protobuf-java-util/4.29.3/protobuf-java-util-4.29.3.jar"
  copy_dep "com/google/protobuf/protobuf-java/4.29.3/protobuf-java-4.29.3.jar"
  copy_dep "com/google/zxing/core/3.5.3/core-3.5.3.jar"
  copy_dep "com/squareup/okhttp3/okhttp/4.12.0/okhttp-4.12.0.jar"
  copy_dep "com/squareup/okio/okio-jvm/3.6.0/okio-jvm-3.6.0.jar"
  copy_dep "com/squareup/okio/okio/3.6.0/okio-3.6.0.jar"
  copy_dep "commons-io/commons-io/2.14.0/commons-io-2.14.0.jar"
  copy_dep "io/github/hzhilong/ybgnb-base-app/0.0.7/ybgnb-base-app-0.0.7.jar"
  copy_dep "io/github/hzhilong/ybgnb-base/0.0.2/ybgnb-base-0.0.2.jar"
  copy_dep "org/apache/commons/commons-collections4/4.4/commons-collections4-4.4.jar"
  copy_dep "org/checkerframework/checker-qual/3.33.0/checker-qual-3.33.0.jar"
  copy_dep "org/freemarker/freemarker/2.3.34/freemarker-2.3.34.jar"
  copy_dep "org/jetbrains/annotations/13.0/annotations-13.0.jar"
  copy_dep "org/jetbrains/kotlin/kotlin-stdlib-common/1.9.10/kotlin-stdlib-common-1.9.10.jar"
  copy_dep "org/jetbrains/kotlin/kotlin-stdlib-jdk7/1.8.21/kotlin-stdlib-jdk7-1.8.21.jar"
  copy_dep "org/jetbrains/kotlin/kotlin-stdlib-jdk8/1.8.21/kotlin-stdlib-jdk8-1.8.21.jar"
  copy_dep "org/jetbrains/kotlin/kotlin-stdlib/1.8.21/kotlin-stdlib-1.8.21.jar"
  copy_dep "org/slf4j/slf4j-api/2.0.16/slf4j-api-2.0.16.jar"
  copy_dep "org/slf4j/slf4j-reload4j/2.0.16/slf4j-reload4j-2.0.16.jar"

  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$ICON_SOURCE" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
    sips -z "$((size * 2))" "$((size * 2))" "$ICON_SOURCE" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET_DIR" -o "$ICON_FILE"

  jpackage \
    --type app-image \
    --dest "$DIST_DIR" \
    --name "$LAUNCHER_NAME" \
    --app-version "$APP_VERSION" \
    --vendor "hzhilong" \
    --input "$INPUT_DIR" \
    --main-jar "$MAIN_JAR" \
    --main-class "$MAIN_CLASS" \
    --icon "$ICON_FILE" \
    --mac-package-identifier "$BUNDLE_ID" \
    --java-options "-Dapple.awt.application.name=$APP_DISPLAY_NAME" \
    --java-options "-Dfile.encoding=UTF-8"

  mv "$JPACKAGE_APP_BUNDLE" "$APP_BUNDLE"
  cat >"$APP_BUNDLE/Contents/MacOS/$WRAPPER_NAME" <<'LAUNCHER'
#!/bin/sh
set -eu

APP_SUPPORT_DIR="${HOME}/Library/Application Support/bilibili-backup"
mkdir -p "$APP_SUPPORT_DIR"
cd "$APP_SUPPORT_DIR"

LAUNCHER_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "$LAUNCHER_DIR/bilibili-backup" "$@"
LAUNCHER
  chmod +x "$APP_BUNDLE/Contents/MacOS/$WRAPPER_NAME"
  /usr/libexec/PlistBuddy -c "Set :CFBundleExecutable $WRAPPER_NAME" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_DISPLAY_NAME" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string $APP_DISPLAY_NAME" "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_DISPLAY_NAME" "$APP_BUNDLE/Contents/Info.plist"
  codesign --force --deep --sign - "$APP_BUNDLE" >/dev/null
}

open_app() {
  /usr/bin/open -n "$APP_BUNDLE"
}

case "$MODE" in
  run)
    stop_app
    build_app
    open_app
    ;;
  --debug|debug)
    stop_app
    build_app
    lldb -- "$APP_BUNDLE/Contents/MacOS/$LAUNCHER_NAME"
    ;;
  --logs|logs)
    stop_app
    build_app
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$LAUNCHER_NAME\""
    ;;
  --telemetry|telemetry)
    stop_app
    build_app
    open_app
    /usr/bin/log stream --info --style compact --predicate "subsystem == \"$BUNDLE_ID\""
    ;;
  --verify|verify)
    stop_app
    build_app
    "$APP_BUNDLE/Contents/MacOS/$WRAPPER_NAME" &
    app_pid=$!
    sleep 5
    kill -0 "$app_pid"
    kill "$app_pid" >/dev/null 2>&1 || true
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
