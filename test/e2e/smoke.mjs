// Browser smoke test with SYNTHETIC data (no live NOAA access needed).
// Usage: PORT=8099 node server.js &   then   node test/e2e/smoke.mjs storm|quiet
// Screenshots are written to the current directory (shot-*.png).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = pw;
import * as H from '../helpers.js';

const scenario = process.argv[2] || 'storm';
const now = new Date();
const storm = scenario === 'storm';
const kps = Array.from({ length: 56 }, (_, i) => storm ? [2,3,4,5.33,6.67,7,6,5,4.33,3.67,3,2.67][i % 12] : 1.67 + (i % 3) * 0.33);
const coords = [];
for (let lon = 0; lon < 360; lon++) for (let lat = -90; lat <= 90; lat++) {
  const oval = Math.exp(-((Math.abs(lat) - (storm ? 55 : 67)) ** 2) / 20) * (storm ? 70 : 25);
  coords.push([lon, lat, Math.round(oval)]);
}
const iso = (d) => d.toISOString().replace('T',' ').slice(0,19);
const xray = []; const prot = [];
for (let m = 1440; m >= 0; m -= 5) {
  const t = new Date(now - m * 60000);
  const flare = storm && m > 300 && m < 400 ? 3e-5 * Math.exp(-((m - 340) ** 2) / 300) : 0;
  xray.push({ time_tag: t.toISOString(), satellite: 18, flux: 2e-7 + flare + 1e-7 * Math.random(), energy: '0.1-0.8nm' });
  xray.push({ time_tag: t.toISOString(), satellite: 18, flux: 1e-8, energy: '0.05-0.4nm' });
  prot.push({ time_tag: t.toISOString(), satellite: 18, flux: storm ? 15 + Math.random() * 5 : 0.3, energy: '>=10 MeV' });
}
const frames = Array.from({ length: 20 }, (_, i) => ({ url: `/images/animations/test/frame_${i}.png`, time_tag: new Date(+now - (10 - i) * 3600000).toISOString() }));
const svgFrame = (i) => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#111"/><text x="20" y="160" fill="#888" font-size="24">TEST FRAME ${i}</text></svg>`;
const kp1m = Array.from({ length: 60 }, (_, i) => ({ time_tag: new Date(+now - (60 - i) * 60000).toISOString().slice(0,19), kp_index: storm ? 6 : 2, estimated_kp: storm ? 6.33 : 1.67, kp: storm ? '6+' : '2-' }));

const routes = {
  'noaa-planetary-k-index.json': H.kpForecastArrays(now, kps).slice(0, 17).map((r, i) => i === 0 ? ['time_tag','Kp','a_running','station_count'] : [r[0], r[1], '5', '8']),
  'noaa-planetary-k-index-forecast.json': H.kpForecastArrays(now, kps),
  'planetary_k_index_1m.json': kp1m,
  'noaa-scales.json': H.scalesJSON(now, storm ? { g: [3, 2, 1], rMinor: [55, 50, 45], rMajor: [15, 15, 10], sProb: [25, 15, 10] } : {}),
  'plasma-1-day.json': H.plasmaArrays(now, storm ? { speed: 720, density: 18 } : {}),
  'mag-1-day.json': H.magArrays(now, storm ? { bz: -16, bt: 22 } : {}),
  'xrays-1-day.json': xray,
  'integral-protons-1-day.json': prot,
  'alerts.json': [{ product_id: 'K06A', issue_datetime: iso(new Date(now - 3600000)), message: 'Space Weather Message Code: ALTK06\r\nSerial Number: 1\r\nIssue Time: test\r\n\r\nALERT: Geomagnetic K-index of 6\r\nThreshold Reached: test\r\n(TEST DATA)' }],
  'ovation_aurora_latest.json': { 'Observation Time': now.toISOString(), 'Forecast Time': new Date(+now + 1800000).toISOString(), 'Data Format': '[Longitude, Latitude, Aurora]', coordinates: coords },
  'enlil.json': frames, 'ovation_north_24h.json': frames, 'ovation_south_24h.json': frames, 'lasco-c3.json': frames, 'suvi-primary-304.json': frames,
};
const texts = {
  '3-day-forecast.txt': ':Product: 3-Day Forecast\n:Issued: test\n(TEST DATA) NOAA Kp index breakdown...',
  '27-day-outlook.txt': H.outlook27Text(now, Array.from({ length: 27 }, (_, i) => [150 + i, [5, 8, 12, 25, 6][i % 5], [2, 3, 4, 5, 2][i % 5]])),
  '45-day-ap-forecast.txt': H.ap45Text(now, Array.from({ length: 45 }, (_, i) => [5, 8, 12, 25, 6][i % 5]), Array.from({ length: 45 }, (_, i) => 150 + i)),
  'discussion.txt': ':Product: Forecast Discussion\n(TEST DATA)',
};
const donkiEnlil = [{ simulationID: 'TEST-ENLIL', estimatedShockArrivalTime: new Date(+now + 5 * 86400000).toISOString(), isEarthGB: false, kp_18: 5, kp_90: 6, kp_135: 7, kp_180: 7, cmeInputs: [{ cmeStartTime: new Date(+now - 86400000).toISOString(), speed: 1100, halfAngle: 40 }], link: 'https://example.invalid' }];
const donkiCme = [{ time21_5: new Date(+now - 86400000).toISOString(), speed: 1100, halfAngle: 40, latitude: 5, longitude: -10, type: 'O', isMostAccurate: true }];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.route(/^https:\/\//, async (route) => {
  const u = new URL(route.request().url());
  const file = u.pathname.split('/').pop();
  if (u.hostname === 'celestrak.org') return route.fulfill({ body: u.search.includes('gps-ops') ? H.syntheticGpsTLE(now) : '', contentType: 'text/plain' });
  if (u.pathname.includes('WSAEnlil')) return route.fulfill({ json: donkiEnlil });
  if (u.pathname.includes('CMEAnalysis')) return route.fulfill({ json: donkiCme });
  if (routes[file]) return route.fulfill({ json: routes[file] });
  if (texts[file]) return route.fulfill({ body: texts[file], contentType: 'text/plain' });
  if (file.endsWith('.png')) return route.fulfill({ body: svgFrame(file), contentType: 'image/svg+xml' });
  console.log('UNROUTED', u.href);
  return route.fulfill({ status: 404, body: 'nope' });
});
await page.goto('http://localhost:8099/');
await page.waitForFunction(() => window.gpsdash?.state?.result, null, { timeout: 20000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const s = window.gpsdash.state;
  return { today: s.result.days.map((d) => `${d.key} ${d.grade} ${d.score}`), now: s.result.now && `${s.result.now.grade} ${s.result.now.score} ${s.result.now.factors.map(f=>f.key).join(',')}`, ext: s.result.extended.length, hours: s.result.hours.length, sats: s.sats.length, geo: s.geometry.length, errors: Object.entries(s.errors).filter(([,v])=>v) };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: `shot-${scenario}-full.png`, fullPage: true });
await page.locator('#magSim').scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.locator('#magSim').screenshot({ path: `shot-${scenario}-sim.png` });
await page.locator('#timeline').screenshot({ path: `shot-${scenario}-timeline.png` });
await page.locator('#cmeCanvas').scrollIntoViewIfNeeded();
await page.waitForTimeout(3000);
await page.locator('#cmeCanvas').screenshot({ path: `shot-${scenario}-cme.png` });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.screenshot({ path: `shot-${scenario}-mobile.png`, fullPage: false });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log('mobile horizontal overflow px:', overflow);
console.log('console:', errors.slice(0, 20));
await browser.close();
