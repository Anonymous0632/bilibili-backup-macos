# v0.0.4-bilitoolkit-macos.3

This release refreshes the integrated `hzhilong/bilitoolkit` macOS build in the `bilitoolkit/` subtree.

## Changes

- Add `bilitoolkit-quick-upgrade-debian/`, a Debian/VPS headless package for the quick-upgrade task plugin.
- Update the account login dialog to use the newer QR login API while still routing Bili API calls through the Electron host client on macOS.
- Keep the macOS Bili API networking fallback from the previous build and normalize tuple headers before retrying certificate-sensitive Bili requests.
- Keep ad-hoc signing for packaged macOS app bundles.

## Artifacts

- `BiliToolkit_0.0.4_arm64.dmg`
- `BiliToolkit_0.0.4_x64.dmg`

## Validation

- Built on macOS 27.0 / arm64 with Node.js 22.23.0 and pnpm 11.7.0.
- Ran `pnpm install --frozen-lockfile`.
- Ran `pnpm run build`.
- Ran `pnpm run build:all`.
- Ran `pnpm run app:dist`.
- Verified both DMGs with `hdiutil verify`.
- Verified the arm64 `.app` with `codesign --verify --deep --strict`.
- Verified arm64 app launch locally.

## Upstream

Based on [hzhilong/bilitoolkit](https://github.com/hzhilong/bilitoolkit).

---

# v0.0.4-bilitoolkit-macos.1

This release adds the newer `hzhilong/bilitoolkit` Electron/Vue app as a separate macOS build.

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
