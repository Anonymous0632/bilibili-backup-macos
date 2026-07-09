const { spawnSync } = require('child_process');
const readline = require('readline');
const { loadConfig, saveConfig } = require('./runtime.cjs');

const QR_GENERATE_URL = 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate';
const QR_POLL_URL = 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll';
const MY_INFO_URL = 'https://api.bilibili.com/x/space/myinfo';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSetCookie(headers) {
  if (headers && typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  if (headers && typeof headers.raw === 'function') return headers.raw()['set-cookie'] || [];
  const value = headers && typeof headers.get === 'function' ? headers.get('set-cookie') : '';
  if (!value) return [];
  return value.split(/,(?=\s*[^=;,\s]+=)/g);
}

function buildCookie(setCookies) {
  const pairs = [];
  const lookup = {};
  for (const setCookie of setCookies) {
    const first = String(setCookie).split(';')[0].trim();
    if (!first || !first.includes('=')) continue;
    const [name, ...rest] = first.split('=');
    const value = rest.join('=');
    lookup[name] = value;
    pairs.push(`${name}=${value}`);
  }
  return {
    cookie: pairs.join('; '),
    uid: lookup.DedeUserID || lookup.DedeUserID__ckMd5 || '',
    bili_jct: lookup.bili_jct || ''
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const json = await response.json();
  return { response, json };
}

async function getMyInfo(cookie) {
  const { json } = await fetchJson(MY_INFO_URL, {
    headers: {
      cookie,
      referer: 'https://www.bilibili.com/',
      'user-agent': 'Mozilla/5.0 BiliToolkitQuickUpgrade/0.0.2'
    }
  });
  if (json.code !== 0) {
    throw new Error(`Cookie 校验失败: code=${json.code}, message=${json.message || ''}`);
  }
  return json.data || {};
}

function printQr(url) {
  const qr = spawnSync('qrencode', ['-t', 'ANSIUTF8', url], { encoding: 'utf8' });
  if (qr.status === 0 && qr.stdout) {
    process.stdout.write(`${qr.stdout}\n`);
  } else {
    process.stdout.write('未检测到 qrencode，已输出二维码链接。\n');
  }
  process.stdout.write(`扫码链接: ${url}\n`);
}

async function loginWithQr(paths, logger) {
  const generated = await fetchJson(QR_GENERATE_URL, {
    headers: { 'user-agent': 'Mozilla/5.0 BiliToolkitQuickUpgrade/0.0.2' }
  });
  if (generated.json.code !== 0 || !generated.json.data) {
    throw new Error(`二维码生成失败: ${JSON.stringify(generated.json)}`);
  }
  const { url, qrcode_key: qrcodeKey } = generated.json.data;
  logger.info('请使用哔哩哔哩手机 APP 扫码，并在手机端确认登录。');
  printQr(url);

  const started = Date.now();
  while (Date.now() - started < 180000) {
    await sleep(2500);
    const pollUrl = `${QR_POLL_URL}?qrcode_key=${encodeURIComponent(qrcodeKey)}`;
    const { response, json } = await fetchJson(pollUrl, {
      headers: { 'user-agent': 'Mozilla/5.0 BiliToolkitQuickUpgrade/0.0.2' },
      redirect: 'manual'
    });
    const code = json && json.data ? json.data.code : json.code;
    if (code === 0) {
      const cookieInfo = buildCookie(getSetCookie(response.headers));
      if (!cookieInfo.cookie || !cookieInfo.bili_jct) {
        throw new Error('登录成功但未拿到完整 Cookie，请重试。');
      }
      const info = await getMyInfo(cookieInfo.cookie);
      const config = loadConfig(paths);
      config.task.users = [{
        mid: String(info.mid || cookieInfo.uid),
        name: info.name || String(info.mid || cookieInfo.uid),
        face: info.face || '',
        userCookie: {
          uid: String(info.mid || cookieInfo.uid),
          cookie: cookieInfo.cookie,
          bili_jct: cookieInfo.bili_jct
        }
      }];
      saveConfig(paths, config);
      logger.info(`登录完成，已保存账号: ${config.task.users[0].name} (${config.task.users[0].mid})`);
      return config.task.users[0];
    }
    if (code === 86090) logger.info('已扫码，等待手机端确认。');
    else if (code === 86101) logger.info('等待扫码。');
    else if (code === 86038) throw new Error('二维码已过期，请重新运行登录命令。');
    else logger.warn(`二维码状态异常: ${JSON.stringify(json)}`);
  }
  throw new Error('二维码登录超时，请重新运行登录命令。');
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

module.exports = {
  ask,
  getMyInfo,
  loginWithQr
};
