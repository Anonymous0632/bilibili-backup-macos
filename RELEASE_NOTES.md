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
- Verified app launch on macOS 27.0.
- Verified installed plugin count, UI plugin loading for 哔哩备份姬 / 图片下载 / 弹幕工具箱, and task plugin configuration view for 速升姬.

## Upstream

Based on [hzhilong/bilitoolkit](https://github.com/hzhilong/bilitoolkit).
