const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sanitizeResult, writeJson } = require('./runtime.cjs');

function buildSystemApi(config, logger) {
  return {
    system: {
      async getLogLevel() {
        return config.logLevel || 'info';
      },
      async saveLog(entry) {
        const level = entry && entry.level ? String(entry.level).toLowerCase() : 'info';
        const data = Array.isArray(entry && entry.data) ? entry.data : [entry && entry.data];
        logger[level] ? logger[level](...data) : logger.info(...data);
        return true;
      }
    }
  };
}

function loadPlugin(pluginPath) {
  const code = fs.readFileSync(pluginPath, 'utf8');
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    console,
    fetch,
    Headers,
    Request,
    Response,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    AbortSignal,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    crypto: globalThis.crypto,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    Blob: globalThis.Blob,
    File: globalThis.File,
    FormData: globalThis.FormData
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  const script = new vm.Script(code, { filename: pluginPath, displayErrors: true });
  script.runInNewContext(sandbox, { timeout: 10000 });
  const exported = module.exports && module.exports.default ? module.exports.default : module.exports;
  if (!exported || typeof exported.run !== 'function') {
    throw new Error(`插件未导出 run(): ${pluginPath}`);
  }
  return exported;
}

function assertPluginLoadable(paths) {
  const plugin = loadPlugin(paths.pluginPath);
  return {
    name: plugin.name || path.basename(paths.pluginPath),
    hasRun: typeof plugin.run === 'function'
  };
}

async function runOnce(paths, config, logger) {
  const users = Array.isArray(config.task && config.task.users) ? config.task.users : [];
  if (users.length === 0) {
    throw new Error('未配置账号。请先运行 bili-quick-upgrade-login 完成二维码登录。');
  }
  const plugin = loadPlugin(paths.pluginPath);
  const context = {
    config: {
      users,
      dailyLogin: config.task.dailyLogin !== false,
      dailyWatch: config.task.dailyWatch !== false,
      dailyCoin: String(config.task.dailyCoin == null ? '2' : config.task.dailyCoin),
      dailyShare: config.task.dailyShare !== false
    },
    logger,
    api: buildSystemApi(config, logger)
  };
  logger.info(`开始执行速升姬任务，账号数量: ${users.length}`);
  const result = await plugin.run(context);
  const clean = sanitizeResult(result);
  writeJson(paths.lastResultPath, clean, 0o600);
  if (result && typeof result.details === 'string') {
    fs.writeFileSync(paths.lastResultHtmlPath, result.details, { mode: 0o600 });
  }
  if (result && result.success === false) {
    throw new Error(result.message || '速升姬任务执行失败');
  }
  logger.info(`任务执行完成: ${(result && result.message) || 'success'}`);
  return clean;
}

module.exports = {
  assertPluginLoadable,
  runOnce
};
