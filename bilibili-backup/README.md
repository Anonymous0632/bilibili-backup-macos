# 哔哩哔哩账号备份 macOS 版

这是面向 macOS 的哔哩哔哩账号数据备份工具，基于原项目 [hzhilong/bilibili-backup](https://github.com/hzhilong/bilibili-backup) 编译并做 macOS 启动适配。

原项目主要面向 Windows 分发。本目录保留原始源码和资源，并补充了 macOS 构建脚本、应用打包流程，以及已验证可双击启动的 macOS DMG 分发包。

## 下载

请在本仓库的 GitHub Releases 下载：

- 最新 Java 版：`bilibili-backup-macos-2.1.6.dmg`

当前构建验证环境：

- macOS 27.0
- Apple Silicon / arm64
- OpenJDK 21
- Maven 3.9.x

DMG 内的 `.app` 已内置 Java runtime，普通使用不需要额外安装 Java。

## Java 版功能增强

本仓库的 Java 版仍基于原项目 [hzhilong/bilibili-backup](https://github.com/hzhilong/bilibili-backup) 2.1.6，并在 macOS 可运行打包基础上补充了以下关注管理增强：

- 修复 macOS 登录扫码后可能出现的 Java TLS `PKIX path building failed` 问题。
- 缓解恢复关注过程中的 `read timeout`：延长 HTTP 超时时间，并对只读 GET 请求增加退避重试。
- 恢复关注遇到疑似 B 站风控、`read timeout`、HTTP 412/429/403 时，不直接停止任务，而是等待 15 分钟后重试当前 UP，等待期间可以手动中断。
- 新增“严格同步关注列表”设置：开启后，恢复关注会让当前关注列表与备份完全一致，当前账号多出来、备份中没有的关注会被取关。该功能不能与分段还原同时使用，以避免误取关。
- 新增“其他工具 -> 取关已注销账号”：扫描当前关注列表，一键取关昵称为 `账号已注销` 的关注对象。

## macOS 适配说明

原程序会使用相对路径写入 `bin/app.data`、日志、cookie 和备份数据。Finder 双击启动 macOS `.app` 时，默认工作目录可能不可写，导致启动时报：

```text
java.io.IOException: Operation not permitted
Failed to launch JVM
```

本仓库的 macOS 包增加了一个启动包装器：双击启动时会先切换到用户可写目录：

```text
~/Library/Application Support/bilibili-backup
```

然后再启动真正的 Java 应用。程序运行产生的数据也会保存在该目录下。

## 从源码构建

需要安装 JDK 21 和 Maven。推荐使用 Homebrew：

```bash
brew install openjdk@21 maven
```

构建并启动 `.app`：

```bash
./script/build_and_run.sh
```

只验证构建和启动：

```bash
./script/build_and_run.sh --verify
```

生成 DMG：

```bash
./script/package_dmg.sh
```

产物位置：

```text
dist/macos/哔哩哔哩账号备份.app
dist/macos-dmg/哔哩哔哩账号备份-2.1.6.dmg
```

## 与上游项目的关系

本目录不是原作者官方 macOS 发布版。代码、功能和许可基于原项目：

- 上游仓库：[hzhilong/bilibili-backup](https://github.com/hzhilong/bilibili-backup)
- 上游 README：[UPSTREAM_README.md](./UPSTREAM_README.md)
- 许可证：MIT License

感谢原作者 hzhilong 的项目工作。

## 注意

原 Java 项目 README 中已说明项目停止维护，相关功能已迁移至作者的新项目。B 站接口和风控策略可能变化，本仓库只保证 macOS 打包、启动和已验证的插件加载适配，不保证所有业务功能长期可用。

“严格同步关注列表”和“取关已注销账号”都会执行取关操作，请在确认当前登录账号和备份数据无误后再使用。
