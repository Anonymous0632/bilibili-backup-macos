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
