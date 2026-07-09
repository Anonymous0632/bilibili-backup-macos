# v2.1.6-macos.4

This release adds stricter following-list management and recovery behavior to the Java Swing macOS build.

## Changes

- Add an optional exact following-list sync mode. When enabled, restoring following data makes the current account match the backup exactly, including unfollowing users that are not present in the backup.
- Prevent exact following-list sync from running with segmented restore, so partial restore pages cannot be mistaken for the full target list.
- Add a restore retry loop for suspected Bilibili risk-control failures. Follow attempts that hit read timeouts, HTTP 412/429/403, request errors, or existing risk-control stop signals now wait 15 minutes and retry the current UP instead of ending the task immediately.
- Add a toolbox action, `取关已注销账号`, that scans the current following list and unfollows de-duplicated users whose display name is `账号已注销`.
- Keep the previous macOS launch wrapper, login TLS fallback, and HTTP timeout/read-retry fixes.

## Artifact

- `bilibili-backup-macos-2.1.6.dmg`

## Validation

- Built on macOS 27.0 / arm64 with OpenJDK 21 and Maven.
- Ran `mvn -DskipTests compile`.
- Ran `./script/build_and_run.sh --verify`.
- Verified the installed `.app` with `codesign --verify --deep --strict`.
- Verified the DMG checksum with `hdiutil verify`.

## Upstream

Based on [hzhilong/bilibili-backup](https://github.com/hzhilong/bilibili-backup).

---

# v2.1.6-macos.2

This release fixes QR-code login failures in the Java Swing macOS build.

## Changes

- Add a shared OkHttp client factory for GUI and CLI flows.
- Preserve default Java TLS validation, with a restricted fallback only for `*.bilibili.com` and `*.hdslb.com` when the embedded runtime cannot build the certificate path.
- Fix the post-scan login step that fetches `https://api.bilibili.com/x/frontend/finger/spi` and previously failed with `PKIX path building failed`.

## Artifact

- `bilibili-backup-macos-2.1.6.dmg`

## Validation

- Verified the failing Bilibili `finger/spi` endpoint returns `code=0` with the patched client.
- Rebuilt the macOS `.app` with OpenJDK 21 and Maven.
- Verified the DMG checksum with `hdiutil verify`.

## Upstream

Based on [hzhilong/bilibili-backup](https://github.com/hzhilong/bilibili-backup).

---

# v2.1.6-macos.1

This release packages `hzhilong/bilibili-backup` 2.1.6 for macOS.

## Changes

- Build the original Java Swing app into a macOS `.app` with an embedded JDK runtime.
- Add a macOS launcher wrapper so Finder double-click launches from a writable user data directory.
- Store runtime data under `~/Library/Application Support/bilibili-backup`.
- Add project-local scripts for rebuilding the app image and DMG.

## Artifact

- `哔哩哔哩账号备份-2.1.6.dmg`

## Validation

- Built on macOS 27.0 / arm64 with OpenJDK 21 and Maven.
- Verified app launch through the Finder-equivalent `open` path.
- Verified the DMG checksum with `hdiutil verify`.

## Upstream

Based on [hzhilong/bilibili-backup](https://github.com/hzhilong/bilibili-backup).

---

# v0.0.4-bilitoolkit-macos.1

This release adds the newer `hzhilong/bilitoolkit` Electron/Vue app as an integrated macOS build alongside the historical Java backup app.

## Changes

- Add the BiliToolkit source under `bilitoolkit/`.
- Replace missing monorepo workspace dependencies with published npm packages so the project builds standalone.
- Add macOS arm64/x64 packaging with DMG and zip outputs.
- Generate a Retina `.icns` icon from the SVG source and enable Electron high-DPI support.
- Increase the default window size to 1280x820 for MacBook displays.
- Fix local plugin loading on macOS by using `webContents.loadFile()` for plugin `dist/index.html` paths.
- Route Bili API requests through Electron's network stack on macOS so backup, restore, and login flows trust the system certificate chain instead of Node's bundled CA list.
- Ad-hoc sign macOS `.app` bundles during packaging so DMG/ZIP contents pass deep code-sign verification.
- Keep local app data under `~/Library/Application Support/BiliToolkit`.
- Disable local-build update checks unless explicitly enabled with `APP_ENABLE_AUTO_UPDATE=true`.

## Artifacts

- `BiliToolkit_0.0.4_arm64.dmg`
- `BiliToolkit_0.0.4_x64.dmg`
- `BiliToolkit_0.0.4_arm64.zip`
- `BiliToolkit_0.0.4_x64.zip`

## Validation

- Built on macOS 27.0 / arm64 with Node.js 22 and pnpm 11.
- Verified `BiliToolkit_0.0.4_arm64.dmg` with `hdiutil verify`.
- Verified arm64 and x64 `.app` bundles with `codesign --verify --deep --strict`.
- Verified app launch on macOS 27.0.
- Verified installed plugin count, UI plugin loading for 哔哩备份姬 / 图片下载 / 弹幕工具箱, and task plugin configuration view for 速升姬.
- Verified 哔哩备份姬 backup and restore views open without new `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `fetch failed` errors; current local account state is logged out, so destructive restore actions were not executed.

## Upstream

Based on [hzhilong/bilitoolkit](https://github.com/hzhilong/bilitoolkit).
