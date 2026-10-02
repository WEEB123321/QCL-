/**
 * /api/sponsors
 *   GET  —— 公开读取感谢名单
 *   POST —— 管理员写入（需请求头 x-admin-password，与 Netlify 环境变量 ADMIN_PASSWORD 比对）
 *
 * 数据存放在 Netlify Blobs（store: qcl, key: sponsors）。
 * 若 Blobs 中还没有数据，GET 返回 404，前端会自动回退到静态的 data/sponsors.json。
 */
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'qcl';
const KEY = 'sponsors';
const MAX_ITEMS = 500;
const MAX_NAME = 40;
const MAX_NOTE = 60;

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    },
    body: JSON.stringify(body)
  };
}

/** 先各自 SHA-256 再逐字节比较，避免长度与短路带来的时序泄漏 */
async function passwordMatches(given, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected))
  ]);
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/* 简易限流：同一实例内按 IP 计数。
   函数冷启动会重置，属"抬高成本"而非绝对防线，
   真正的强度来自 24 位随机密码 + PBKDF2 校验。 */
const buckets = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const rec = buckets.get(ip) || { start: now, count: 0, until: 0 };
  if (rec.until > now) return Math.ceil((rec.until - now) / 1000);
  if (now - rec.start > 60_000) {
    rec.start = now;
    rec.count = 0;
  }
  rec.count += 1;
  if (rec.count > 6) {
    rec.until = now + 300_000;
    buckets.set(ip, rec);
    return 300;
  }
  buckets.set(ip, rec);
  return 0;
}

function clean(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name == null ? '' : raw.name).trim().slice(0, MAX_NAME);
  if (!name) return null;
  const amount = Number(raw.amount);
  const date = String(raw.date == null ? '' : raw.date).trim().slice(0, 10);
  const note = String(raw.note == null ? '' : raw.note).trim().slice(0, MAX_NOTE);
  return {
    name,
    amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    note
  };
}

export const handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const store = getStore(STORE_NAME);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { Allow: 'GET, POST, OPTIONS' }, body: '' };
  }

  /* ---------------- 读取 ---------------- */
  if (method === 'GET') {
    try {
      const data = await store.get(KEY, { type: 'json' });
      if (data && Array.isArray(data.sponsors)) {
        return json({ source: 'blobs', updated: data.updated || null, sponsors: data.sponsors });
      }
    } catch (err) {
      console.error('[sponsors] read failed:', err && err.message);
    }
    return json({ error: 'not-initialized' }, 404);
  }

  /* ---------------- 写入 ---------------- */
  if (method === 'POST') {
    const ip =
      (event.headers['x-nf-client-connection-ip'] ||
        event.headers['x-forwarded-for'] ||
        'unknown').split(',')[0].trim();

    const wait = rateLimit(ip);
    if (wait > 0) {
      return json({ ok: false, error: '尝试过于频繁，请 ' + wait + ' 秒后再试' }, 429);
    }

    const expected = process.env.ADMIN_PASSWORD || '';
    if (!expected) {
      return json({ ok: false, error: '服务器未配置 ADMIN_PASSWORD 环境变量' }, 500);
    }

    const given =
      event.headers['x-admin-password'] || event.headers['X-Admin-Password'] || '';
    if (!given) return json({ ok: false, error: '缺少密码' }, 401);
    if (!(await passwordMatches(given, expected))) {
      return json({ ok: false, error: '密码错误' }, 403);
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return json({ ok: false, error: '请求体不是合法 JSON' }, 400);
    }

    if (!Array.isArray(payload.sponsors)) {
      return json({ ok: false, error: 'sponsors 必须是数组' }, 400);
    }
    if (payload.sponsors.length > MAX_ITEMS) {
      return json({ ok: false, error: '单次最多 ' + MAX_ITEMS + ' 条' }, 400);
    }

    const sponsors = payload.sponsors.map(clean).filter(Boolean);
    const updated = new Date().toISOString().slice(0, 10);

    try {
      await store.setJSON(KEY, { updated, sponsors });
    } catch (err) {
      console.error('[sponsors] write failed:', err && err.message);
      return json({ ok: false, error: '写入失败：' + (err && err.message) }, 500);
    }

    return json({ ok: true, updated, count: sponsors.length, sponsors });
  }

  return json({ ok: false, error: '不支持的方法' }, 405);
};
