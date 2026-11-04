// Network layer. Browsers fetch NOAA/CelesTrak/NASA directly (they send CORS
// headers). If a direct request fails and the page is being served by the
// bundled server.js, the request is retried through its /api/proxy route.

import { CACHE_TTL } from './config.js';

const memory = new Map();
let proxyAvailable = null; // unknown until first probe

async function probeProxy() {
  if (proxyAvailable !== null) return proxyAvailable;
  try {
    const r = await fetch('api/health', { cache: 'no-store' });
    proxyAvailable = r.ok;
  } catch {
    proxyAvailable = false;
  }
  return proxyAvailable;
}

function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode: memory cache still works */
  }
}

async function rawFetch(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch a URL as text with caching and proxy fallback.
 * @param {string} url
 * @param {{ttl?: number, persist?: boolean, force?: boolean}} opts
 */
export async function fetchText(url, { ttl = CACHE_TTL.default, persist = false, force = false } = {}) {
  const now = Date.now();
  const key = `gpsdash:${url}`;
  if (!force) {
    const hit = memory.get(url) || (persist ? storageGet(key) : null);
    if (hit && now - hit.t < ttl) return hit.body;
  }

  let body;
  try {
    body = await rawFetch(url);
  } catch (directErr) {
    if (await probeProxy()) {
      body = await rawFetch(`api/proxy?url=${encodeURIComponent(url)}`);
    } else {
      // Fall back to a stale cached copy rather than nothing.
      const stale = memory.get(url) || storageGet(key);
      if (stale) return stale.body;
      throw directErr;
    }
  }
  const entry = { t: now, body };
  memory.set(url, entry);
  if (persist) storageSet(key, entry);
  return body;
}

export async function fetchJSON(url, opts) {
  return JSON.parse(await fetchText(url, opts));
}

/** Run a set of named loaders in parallel; failures become `null` + error list. */
export async function loadAll(loaders, arg) {
  const names = Object.keys(loaders);
  const settled = await Promise.allSettled(names.map((n) => loaders[n](arg)));
  const data = {};
  const errors = {};
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') data[names[i]] = s.value;
    else {
      data[names[i]] = null;
      errors[names[i]] = String(s.reason?.message || s.reason);
    }
  });
  return { data, errors };
}
