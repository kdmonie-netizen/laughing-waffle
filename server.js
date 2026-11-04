#!/usr/bin/env node
// Zero-dependency local server for the GPS Conditions dashboard.
//
//   node server.js            → http://localhost:8080
//   PORT=3000 node server.js
//
// Serves ./public and provides /api/proxy?url=… for the allow-listed data
// hosts. The browser calls NOAA directly first and only uses the proxy if a
// direct request fails (e.g. a corporate network that strips CORS headers).

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '127.0.0.1';

const ALLOWED_HOSTS = new Set([
  'services.swpc.noaa.gov',
  'celestrak.org',
  'api.nasa.gov',
  'kauai.ccmc.gsfc.nasa.gov',
]);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const cache = new Map(); // url → { t, status, type, body }
const CACHE_MS = 2 * 60 * 1000;

async function proxy(req, res, target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return send(res, 400, 'Bad url');
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return send(res, 403, `Host not allowed: ${url.hostname}`);
  }
  const hit = cache.get(url.href);
  if (hit && Date.now() - hit.t < CACHE_MS) {
    res.writeHead(hit.status, { 'content-type': hit.type, 'x-cache': 'HIT' });
    return res.end(hit.body);
  }
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'gps-conditions-dashboard' }, signal: AbortSignal.timeout(20000) });
    const body = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get('content-type') || 'application/octet-stream';
    if (r.ok) cache.set(url.href, { t: Date.now(), status: r.status, type, body });
    res.writeHead(r.status, { 'content-type': type, 'x-cache': 'MISS' });
    res.end(body);
  } catch (e) {
    send(res, 502, `Upstream error: ${e.message}`);
  }
}

function send(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

async function serveStatic(res, pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  let file = join(ROOT, rel || 'index.html');
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    send(res, 404, 'Not found');
  }
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (u.pathname === '/api/health') return send(res, 200, 'ok');
  if (u.pathname === '/api/proxy') return proxy(req, res, u.searchParams.get('url') || '');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  return serveStatic(res, u.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`GPS Conditions dashboard → http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
