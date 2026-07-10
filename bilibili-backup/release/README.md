# Release Artifacts

DMG files are not committed to git. They are generated locally and uploaded to GitHub Releases.

Generate a fresh DMG with:

```bash
./bilibili-backup/script/package_dmg.sh
```

BiliToolkit release assets are generated from the integrated Electron project:

```bash
cd bilitoolkit
pnpm install
pnpm run build
pnpm run build:all
pnpm run app:dist
```

Generated BiliToolkit assets are uploaded to GitHub Releases instead of being committed:

```text
bilitoolkit/release/0.0.4/BiliToolkit_0.0.4_arm64.dmg
bilitoolkit/release/0.0.4/BiliToolkit_0.0.4_x64.dmg
```
