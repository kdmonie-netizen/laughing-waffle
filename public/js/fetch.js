// Network layer. Browsers fetch NOAA/CelesTrak/NASA directly (they send CORS
// headers). If a direct request fails and the page is being served by the
// bundled server.js, the request is retried through its /api/proxy route.

import { CACHE_TTL } from './config.js';

const memory = new Map();
let proxyAvailable = null; // unknown until first probe

// GPS-H5: when a feed fails, a saved copy may stand in, but only while it is
// young enough to still describe today. Past this age the feed counts as
// missing, so the page says so instead of showing yesterday's quiet Sun.
const HOUR = 3600000;
export function staleLimit(ttl) {
  return Math.min(24 * HOUR, Math.max(HOUR, ttl * 12));
}

// url → age (ms) of every saved copy served in place of a failed fetch.
const staleServed = new Map();
export function staleFeeds() {
  return [...staleServed].map(([url, age]) => ({ url, age }));
}

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
 * A server error (HTTP 5xx, e.g. CelesTrak's occasional 500) is retried once
 * after 1.5 s. A network/CORS failure goes straight to the proxy. Other HTTP
 * errors (404) are not retried.
 * `memo: false` keeps the body out of the in-memory cache (for big one-off
 * files such as GloTEC frames, which would otherwise pile up in a long-open tab).
 * @param {string} url
 * `proxyFirst: true` is for hosts known to send no CORS headers (NAVCEN, the
 * Galileo GSC): the browser can't read them directly, so skip that attempt.
 * Proxied requests get 45 s, longer than the server's own 30 s upstream limit,
 * so the page never gives up on an answer the server is still fetching.
 * @param {{ttl?: number, persist?: boolean, force?: boolean, memo?: boolean, proxyFirst?: boolean}} opts
 */
export async function fetchText(url, { ttl = CACHE_TTL.default, persist = false, force = false, memo = true, proxyFirst = false } = {}) {
  const now = Date.now();
  const key = `gpsdash:${url}`;
  if (!force) {
    const hit = (memo && memory.get(url)) || (persist ? storageGet(key) : null);
    if (hit && now - hit.t < ttl) return hit.body;
  }

  let body;
  const viaProxy = () => rawFetch(`api/proxy?url=${encodeURIComponent(url)}`, 45000);
  if (proxyFirst) {
    try {
      if (!(await probeProxy())) throw new Error('needs the local server (desktop app or npm start): this site sends no CORS headers');
      body = await viaProxy();
    } catch (e) {
      // A stale copy is better than nothing, but not for ever: past a day it
      // is treated as not loaded (for the health lists that means "unknown").
      const stale = (memo && memory.get(url)) || storageGet(key);
      if (stale && now - stale.t < Math.max(ttl * 2, 86400000)) {
        staleServed.set(url, now - stale.t);
        return stale.body;
      }
      throw e;
    }
    staleServed.delete(url);
    const entry = { t: now, body };
    if (memo) memory.set(url, entry);
    if (persist) storageSet(key, entry);
    return body;
  }
  try {
    body = await rawFetch(url);
  } catch (firstErr) {
    let directErr = firstErr;
    if (/^HTTP 5\d\d/.test(String(firstErr?.message))) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        body = await rawFetch(url);
        directErr = null;
      } catch (e) {
        directErr = e;
      }
    }
    if (!directErr) {
      // the retry worked
    } else if (await probeProxy()) {
      body = await viaProxy();
    } else {
      // Fall back to a saved copy, but only a young one (see staleLimit).
      const stale = memory.get(url) || storageGet(key);
      if (stale && now - stale.t < staleLimit(ttl)) {
        staleServed.set(url, now - stale.t);
        return stale.body;
      }
      throw directErr;
    }
  }
  staleServed.delete(url);
  const entry = { t: now, body };
  if (memo) memory.set(url, entry);
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
