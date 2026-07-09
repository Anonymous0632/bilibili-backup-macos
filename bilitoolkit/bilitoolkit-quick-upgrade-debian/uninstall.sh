#!/usr/bin/env bash
set -euo pipefail

APP_NAME="bilitoolkit-quick-upgrade"

if [[ "$(id -u)" != "0" ]]; then
  echo "请使用 root 或 sudo 运行 uninstall.sh" >&2
  exit 1
fi

rm -f "/etc/cron.d/${APP_NAME}"
rm -f /usr/local/bin/bili-quick-upgrade /usr/local/bin/bili-quick-upgrade-login
rm -rf "/opt/${APP_NAME}"

if [[ "${1:-}" == "--purge" ]]; then
  rm -rf "/etc/${APP_NAME}" "/var/lib/${APP_NAME}" "/var/log/${APP_NAME}"
  echo "已卸载并清理配置、状态和日志。"
else
  echo "已卸载程序和 cron。配置、状态和日志已保留；如需清理请运行: sudo ./uninstall.sh --purge"
fi
