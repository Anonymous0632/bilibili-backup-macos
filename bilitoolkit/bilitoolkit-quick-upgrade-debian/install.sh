#!/usr/bin/env bash
set -euo pipefail

APP_NAME="bilitoolkit-quick-upgrade"
APP_DIR="/opt/${APP_NAME}"
ETC_DIR="/etc/${APP_NAME}"
STATE_DIR="/var/lib/${APP_NAME}"
LOG_DIR="/var/log/${APP_NAME}"
CRON_FILE="/etc/cron.d/${APP_NAME}"

if [[ "$(id -u)" != "0" ]]; then
  echo "请使用 root 或 sudo 运行 install.sh" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 node。请先安装 Node.js ^20.19.0 或 >=22.12.0。" >&2
  exit 1
fi

node - <<'NODE'
const [major, minor] = process.versions.node.split('.').map(Number);
if (!((major === 20 && minor >= 19) || major >= 22)) {
  console.error(`Node 版本不满足要求: ${process.versions.node}，需要 ^20.19.0 或 >=22.12.0。`);
  process.exit(1);
}
NODE

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "${APP_DIR}" "${ETC_DIR}" "${STATE_DIR}" "${LOG_DIR}"
chmod 755 "${APP_DIR}"
chmod 700 "${ETC_DIR}" "${STATE_DIR}" "${LOG_DIR}"

if [[ "${SRC_DIR}" != "${APP_DIR}" ]]; then
  find "${APP_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  tar -C "${SRC_DIR}" \
    --exclude='./.git' \
    --exclude='./node_modules' \
    --exclude='*.log' \
    -cf - . | tar -C "${APP_DIR}" -xf -
fi

chmod +x "${APP_DIR}/bin/bili-quick-upgrade" "${APP_DIR}/bin/bili-quick-upgrade-login"

if [[ ! -f "${ETC_DIR}/config.json" ]]; then
  cp "${APP_DIR}/config.example.json" "${ETC_DIR}/config.json"
fi
chmod 600 "${ETC_DIR}/config.json"

ln -sf "${APP_DIR}/bin/bili-quick-upgrade" /usr/local/bin/bili-quick-upgrade
ln -sf "${APP_DIR}/bin/bili-quick-upgrade-login" /usr/local/bin/bili-quick-upgrade-login

cat > "${CRON_FILE}" <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
BILI_QUICK_UPGRADE_CONFIG=${ETC_DIR}/config.json
BILI_QUICK_UPGRADE_STATE=${STATE_DIR}/state.json
BILI_QUICK_UPGRADE_LOG=${LOG_DIR}/quick-upgrade.log
BILI_QUICK_UPGRADE_APP_DIR=${APP_DIR}

0 * * * * root ${APP_DIR}/bin/bili-quick-upgrade tick >> ${LOG_DIR}/cron.log 2>&1
CRON
chmod 644 "${CRON_FILE}"

touch "${LOG_DIR}/quick-upgrade.log" "${LOG_DIR}/cron.log"
chmod 600 "${LOG_DIR}/quick-upgrade.log" "${LOG_DIR}/cron.log"

echo "安装完成。"
echo "下一步："
echo "  1. bili-quick-upgrade-login"
echo "  2. bili-quick-upgrade status"
echo "  3. bili-quick-upgrade run --once --yes"
