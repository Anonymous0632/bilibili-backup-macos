const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const APP_NAME = 'bilitoolkit-quick-upgrade';
const REQUIRED_NODE_MESSAGE = '需要 Node.js ^20.19.0 或 >=22.12.0。';

function isRoot() {
  return typeof process.getuid === 'function' && process.getuid() === 0;
}

function resolvePaths() {
  const rootBase = '/';
  const userBase = path.join(os.homedir(), '.local', 'share', APP_NAME);
  const useSystemPaths = isRoot();
  const appDir = process.env.BILI_QUICK_UPGRADE_APP_DIR
    || (useSystemPaths ? path.join(rootBase, 'opt', APP_NAME) : path.resolve(__dirname, '..'));
  const configPath = process.env.BILI_QUICK_UPGRADE_CONFIG
    || (useSystemPaths
      ? path.join(rootBase, 'etc', APP_NAME, 'config.json')
      : path.join(os.homedir(), '.config', APP_NAME, 'config.json'));
  const statePath = process.env.BILI_QUICK_UPGRADE_STATE
    || (useSystemPaths
      ? path.join(rootBase, 'var', 'lib', APP_NAME, 'state.json')
      : path.join(userBase, 'state.json'));
  const logPath = process.env.BILI_QUICK_UPGRADE_LOG
    || (useSystemPaths
      ? path.join(rootBase, 'var', 'log', APP_NAME, 'quick-upgrade.log')
      : path.join(userBase, 'quick-upgrade.log'));
  const pluginPath = process.env.BILI_QUICK_UPGRADE_PLUGIN
    || path.join(appDir, 'plugin', 'index.js');
  return {
    appDir,
    configPath,
    statePath,
    logPath,
    pluginPath,
    lockPath: path.join(path.dirname(statePath), 'run.lock'),
    lastResultPath: path.join(path.dirname(statePath), 'last-result.json'),
    lastResultHtmlPath: path.join(path.dirname(statePath), 'last-result.html')
  };
}

function ensureDir(dir, mode) {
  fs.mkdirSync(dir, { recursive: true, mode });
  if (mode) fs.chmodSync(dir, mode);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeJson(file, value, mode) {
  ensureDir(path.dirname(file), mode === 0o600 ? 0o700 : 0o755);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: mode || 0o644 });
  fs.renameSync(tmp, file);
  if (mode) fs.chmodSync(file, mode);
}

function defaultConfig() {
  return {
    timezone: 'Asia/Shanghai',
    randomWindow: { start: '09:00', end: '23:00' },
    retry: { maxAttempts: 2, delayMinutes: { min: 30, max: 90 } },
    logLevel: 'error',
    task: {
      users: [],
      dailyLogin: true,
      dailyWatch: true,
      dailyCoin: '2',
      dailyShare: true
    }
  };
}

function mergeConfig(config) {
  const base = defaultConfig();
  return {
    ...base,
    ...config,
    randomWindow: { ...base.randomWindow, ...(config.randomWindow || {}) },
    retry: {
      ...base.retry,
      ...(config.retry || {}),
      delayMinutes: {
        ...base.retry.delayMinutes,
        ...((config.retry && config.retry.delayMinutes) || {})
      }
    },
    task: { ...base.task, ...(config.task || {}) }
  };
}

function loadConfig(paths) {
  return mergeConfig(readJson(paths.configPath, defaultConfig()));
}

function saveConfig(paths, config) {
  writeJson(paths.configPath, mergeConfig(config), 0o600);
}

function createLogger(logPath, level = 'info') {
  ensureDir(path.dirname(logPath), 0o700);
  const ranks = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
  const threshold = ranks[level] == null ? ranks.info : ranks[level];
  function line(levelName, args) {
    if ((ranks[levelName] == null ? ranks.info : ranks[levelName]) > threshold) return;
    const text = args.map((arg) => {
      if (typeof arg === 'string') return arg;
      return util.inspect(arg, { depth: 6, colors: false, breakLength: 120 });
    }).join(' ');
    const output = `[${new Date().toISOString()}] [${levelName.toUpperCase()}] ${text}`;
    fs.appendFileSync(logPath, `${output}\n`);
    const stream = levelName === 'error' ? process.stderr : process.stdout;
    stream.write(`${output}\n`);
  }
  return {
    error: (...args) => line('error', args),
    warn: (...args) => line('warn', args),
    info: (...args) => line('info', args),
    debug: (...args) => line('debug', args),
    trace: (...args) => line('trace', args)
  };
}

function checkNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map((part) => Number(part));
  const ok = (major === 20 && minor >= 19) || major >= 22;
  if (!ok) {
    throw new Error(`${REQUIRED_NODE_MESSAGE} 当前版本: ${process.versions.node}`);
  }
}

function sanitizeResult(result) {
  if (!result || typeof result !== 'object') return result;
  const copy = { ...result };
  if (typeof copy.details === 'string' && copy.details.length > 1000) {
    copy.details = `${copy.details.slice(0, 1000)}...`;
  }
  return copy;
}

function maskCookie(cookie) {
  if (!cookie) return '';
  return String(cookie).split(';').map((item) => {
    const [name] = item.trim().split('=');
    return name ? `${name}=***` : '***';
  }).join('; ');
}

module.exports = {
  APP_NAME,
  REQUIRED_NODE_MESSAGE,
  checkNodeVersion,
  createLogger,
  defaultConfig,
  ensureDir,
  loadConfig,
  maskCookie,
  readJson,
  resolvePaths,
  sanitizeResult,
  saveConfig,
  writeJson
};
