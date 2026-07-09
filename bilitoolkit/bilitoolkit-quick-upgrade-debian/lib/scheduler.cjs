const fs = require('fs');
const path = require('path');
const { readJson, writeJson } = require('./runtime.cjs');
const { runOnce } = require('./runner.cjs');

function pad(number) {
  return String(number).padStart(2, '0');
}

function zonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    seconds: Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)
  };
}

function parseClock(value) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ''));
  if (!match) throw new Error(`非法时间格式: ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) throw new Error(`非法时间格式: ${value}`);
  return hour * 3600 + minute * 60 + second;
}

function formatClock(seconds) {
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;
  return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function randomInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function makeDailyState(config, now = new Date()) {
  const nowParts = zonedParts(now, config.timezone || 'Asia/Shanghai');
  const start = parseClock(config.randomWindow && config.randomWindow.start);
  const end = parseClock(config.randomWindow && config.randomWindow.end);
  if (end <= start) throw new Error('randomWindow.end 必须晚于 randomWindow.start');
  const scheduledSeconds = randomInt(start, end);
  return {
    date: nowParts.date,
    status: 'scheduled',
    scheduledLocalTime: formatClock(scheduledSeconds),
    scheduledSeconds,
    attempts: 0,
    maxAttempts: Number((config.retry && config.retry.maxAttempts) || 2),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

function loadState(paths, config) {
  const now = new Date();
  const today = zonedParts(now, config.timezone || 'Asia/Shanghai').date;
  const current = readJson(paths.statePath, null);
  if (!current || current.date !== today) {
    const fresh = makeDailyState(config, now);
    writeJson(paths.statePath, fresh, 0o600);
    return fresh;
  }
  return current;
}

function saveState(paths, state) {
  state.updatedAt = new Date().toISOString();
  writeJson(paths.statePath, state, 0o600);
}

function scheduleRetry(state, config) {
  const retry = config.retry || {};
  const delay = retry.delayMinutes || {};
  const min = Number(delay.min || 30);
  const max = Number(delay.max || 90);
  const minutes = randomInt(min, max);
  state.status = 'retry-scheduled';
  state.nextRetryAt = Date.now() + minutes * 60 * 1000;
  state.nextRetryDelayMinutes = minutes;
}

function acquireLock(paths, logger) {
  fs.mkdirSync(path.dirname(paths.lockPath), { recursive: true, mode: 0o700 });
  try {
    const fd = fs.openSync(paths.lockPath, 'wx', 0o600);
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    return () => {
      try { fs.closeSync(fd); } catch (_) {}
      try { fs.unlinkSync(paths.lockPath); } catch (_) {}
    };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const stat = fs.statSync(paths.lockPath);
    if (Date.now() - stat.mtimeMs > 2 * 60 * 60 * 1000) {
      logger.warn('发现超过 2 小时的旧锁，已清理。');
      fs.unlinkSync(paths.lockPath);
      return acquireLock(paths, logger);
    }
    logger.info('已有任务正在运行，本次 tick 跳过。');
    return null;
  }
}

async function tick(paths, config, logger) {
  let state = loadState(paths, config);
  const parts = zonedParts(new Date(), config.timezone || 'Asia/Shanghai');
  if (state.status === 'success') {
    logger.info(`今天已完成，计划时间 ${state.scheduledLocalTime}。`);
    return { executed: false, state };
  }
  if (state.status === 'exhausted') {
    logger.warn('今天重试次数已耗尽。');
    return { executed: false, state };
  }
  if (state.status === 'retry-scheduled') {
    if (Date.now() < Number(state.nextRetryAt || 0)) {
      logger.info(`等待重试时间: ${new Date(state.nextRetryAt).toISOString()}`);
      return { executed: false, state };
    }
  } else if (parts.seconds < Number(state.scheduledSeconds)) {
    logger.info(`未到今天随机执行时间 ${state.scheduledLocalTime} (${config.timezone || 'Asia/Shanghai'})。`);
    return { executed: false, state };
  }

  const release = acquireLock(paths, logger);
  if (!release) return { executed: false, state };
  try {
    state.status = 'running';
    state.lastRunAt = new Date().toISOString();
    saveState(paths, state);
    const result = await runOnce(paths, config, logger);
    state = { ...state, status: 'success', lastResult: result, lastError: null };
    saveState(paths, state);
    return { executed: true, state };
  } catch (error) {
    state.attempts = Number(state.attempts || 0) + 1;
    state.lastError = error && error.stack ? error.stack : String(error);
    if (state.attempts <= Number((config.retry && config.retry.maxAttempts) || 2)) {
      scheduleRetry(state, config);
      logger.error(`任务失败，将在 ${state.nextRetryDelayMinutes} 分钟后重试: ${error.message || error}`);
    } else {
      state.status = 'exhausted';
      logger.error(`任务失败，今天重试次数已耗尽: ${error.message || error}`);
    }
    saveState(paths, state);
    throw error;
  } finally {
    release();
  }
}

module.exports = {
  loadState,
  makeDailyState,
  saveState,
  tick,
  zonedParts
};
