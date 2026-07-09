# BiliToolkit 速升姬 Debian/VPS 版

这是只包含 `bilitoolkit-plugin-quick-upgrade@0.0.2` 的无头运行包，用于在 Debian 或 Debian 系 VPS 上长期执行速升姬任务。它不包含 Electron、不包含 BiliToolkit 主界面、不包含备份姬或其它插件。

## 功能

- VPS 终端二维码登录，Cookie 保存在 VPS 本地。
- 每天按北京时间 `09:00-23:00` 随机挑一个时间执行。
- 一次执行登录、观看、投币、分享。
- 当天失败后随机延迟 `30-90` 分钟重试，最多重试 `2` 次。
- cron 每小时运行一次 `tick`，真正执行时间由本地状态文件控制。

## 系统要求

- Debian 或 Debian 系 Linux。
- root 或 sudo 权限。
- Node.js `^20.19.0` 或 `>=22.12.0`。
- VPS 可以访问哔哩哔哩 API。
- 可选：安装 `qrencode` 后终端会直接显示二维码；未安装时会显示扫码链接。

## 安装

把整个目录上传到 VPS 后，在目录内运行：

```bash
sudo ./install.sh
```

安装后固定路径：

- 程序：`/opt/bilitoolkit-quick-upgrade`
- 配置：`/etc/bilitoolkit-quick-upgrade/config.json`
- 状态：`/var/lib/bilitoolkit-quick-upgrade/state.json`
- 日志：`/var/log/bilitoolkit-quick-upgrade/quick-upgrade.log`
- cron：`/etc/cron.d/bilitoolkit-quick-upgrade`

## 登录

```bash
sudo bili-quick-upgrade-login
```

手机 B 站扫码确认后，脚本会把账号 Cookie 写入：

```bash
/etc/bilitoolkit-quick-upgrade/config.json
```

配置文件权限会设置为 `600`，配置目录权限为 `700`。

## 查看状态

```bash
sudo bili-quick-upgrade status
```

状态会显示配置路径、日志路径、账号、今天随机执行时间和 Cookie 校验结果。只看本地状态、不校验 Cookie：

```bash
sudo bili-quick-upgrade status --no-check-cookie
```

## 手动执行一次

首次手动执行前请确认：这会真实执行登录、观看、分享和投币。

```bash
sudo bili-quick-upgrade run --once
```

非交互环境或你已经确认要执行时：

```bash
sudo bili-quick-upgrade run --once --yes
```

## 随机执行策略

cron 文件内容为每小时运行一次：

```cron
0 * * * * root /opt/bilitoolkit-quick-upgrade/bin/bili-quick-upgrade tick >> /var/log/bilitoolkit-quick-upgrade/cron.log 2>&1
```

`tick` 的行为：

1. 如果今天还没有状态文件，生成一个北京时间 `09:00-23:00` 内的随机执行时间。
2. 当前时间未到则退出。
3. 到点后加锁执行，避免并发。
4. 成功后标记今天完成。
5. 失败后随机延迟 `30-90` 分钟重试。
6. 当天最多重试 `2` 次，超过后标记为 `exhausted`。

## 配置

默认配置：

```json
{
  "timezone": "Asia/Shanghai",
  "randomWindow": {
    "start": "09:00",
    "end": "23:00"
  },
  "retry": {
    "maxAttempts": 2,
    "delayMinutes": {
      "min": 30,
      "max": 90
    }
  },
  "logLevel": "error",
  "task": {
    "users": [],
    "dailyLogin": true,
    "dailyWatch": true,
    "dailyCoin": "2",
    "dailyShare": true
  }
}
```

`dailyCoin` 可以改为 `"0"` 到 `"5"`。默认按你的方案设置为 `"2"`。

## 日志

```bash
sudo tail -f /var/log/bilitoolkit-quick-upgrade/quick-upgrade.log
sudo tail -f /var/log/bilitoolkit-quick-upgrade/cron.log
```

最近一次插件返回结果会保存在：

```bash
/var/lib/bilitoolkit-quick-upgrade/last-result.json
/var/lib/bilitoolkit-quick-upgrade/last-result.html
```

## 卸载

只卸载程序和 cron，保留配置、状态和日志：

```bash
sudo /opt/bilitoolkit-quick-upgrade/uninstall.sh
```

同时清理配置、状态和日志：

```bash
sudo /opt/bilitoolkit-quick-upgrade/uninstall.sh --purge
```

## 本机 BiliToolkit 定时任务

VPS 验证成功后，建议禁用本机 BiliToolkit 里的速升姬定时任务，避免重复投币或重复触发风控。本机任务通常在 BiliToolkit 界面里关闭；如果需要，我也可以继续帮你用本机数据库把 `bilitoolkit-plugin-quick-upgrade` 的 `enabled` 改为 `0`。
