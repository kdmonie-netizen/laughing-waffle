// Browser smoke test with SYNTHETIC data (no live NOAA access needed).
// Usage: PORT=8099 node server.js &   then   node test/e2e/smoke.mjs storm|quiet
// SMOKE_URL=http://127.0.0.1:5569/ tests another server (e.g. the desktop app.py).
// PW_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own Chromium.
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
  'rtsw_wind_1m.json': H.rtswWind(now, storm ? { speed: 720, density: 18 } : {}),
  'rtsw_mag_1m.json': H.rtswMag(now, storm ? { bz: -16, bt: 22 } : {}),
  '45-day-forecast.json': H.ap45JSON(now, Array.from({ length: 45 }, (_, i) => [5, 8, 12, 25, 6][i % 5]), Array.from({ length: 45 }, (_, i) => 150 + i)),
  'xrays-1-day.json': xray,
  'integral-protons-1-day.json': prot,
  'alerts.json': [{ product_id: 'K06A', issue_datetime: iso(new Date(now - 3600000)), message: 'Space Weather Message Code: ALTK06\r\nSerial Number: 1\r\nIssue Time: test\r\n\r\nALERT: Geomagnetic K-index of 6\r\nThreshold Reached: test\r\n(TEST DATA)' }],
  'ovation_aurora_latest.json': { 'Observation Time': now.toISOString(), 'Forecast Time': new Date(+now + 1800000).toISOString(), 'Data Format': '[Longitude, Latitude, Aurora]', coordinates: coords },
  'enlil.json': frames, 'ovation_north_24h.json': frames, 'ovation_south_24h.json': frames, 'lasco-c3.json': frames, 'suvi-primary-304.json': frames,
};
const texts = {
  '3-day-forecast.txt': ':Product: 3-Day Forecast\n:Issued: test\n(TEST DATA) NOAA Kp index breakdown...',
  '27-day-outlook.txt': H.outlook27Text(now, Array.from({ length: 27 }, (_, i) => [150 + i, [5, 8, 12, 25, 6][i % 5], [2, 3, 4, 5, 2][i % 5]])),
  'discussion.txt': ':Product: Forecast Discussion\n(TEST DATA)',
};
// ---- 1.2.0 sources: synthetic, timed from `now` so the freshness rules apply
import { readFileSync } from 'node:fs';
const FX = (n) => readFileSync(new URL(`../fixtures/${n}`, import.meta.url), 'utf8');
const jday = (d) => {
  const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
  return `${String(doy).padStart(3, '0')}/${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const msgDate = (d) => `${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}Z ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
// Plant the outage on a satellite that is actually over Denver (the default site) now.
const { buildSatrecs, visibleSatellites } = await import('../../public/js/gnss.js');
const { DEFAULT_SETTINGS } = await import('../../public/js/config.js');
const overhead = visibleSatellites(buildSatrecs({ GPS: H.syntheticGpsTLE(now) }), now, DEFAULT_SETTINGS.lat, DEFAULT_SETTINGS.lon, 0, DEFAULT_SETTINGS.elevationMask);
const OUT_PRN = /PRN (\d+)/.exec(overhead[0].name)[1];
const SCHED_PRN = OUT_PRN === '08' ? '09' : '08';
const yesterday = new Date(+now - 86400000);
const tomorrow = new Date(+now + 86400000);
// PRN 07 out until further notice since yesterday (nothing closes it); PRN 08 scheduled tomorrow.
const navcenOA = [
  'GPS OPERATIONAL ADVISORY        999.OA1',
  'SUBJ: GPS STATUS      TEST',
  '2. CURRENT ADVISORIES AND FORECASTS :',
  'A. FORECASTS:',
  `2026901       ${msgDate(yesterday)}    ${SCHED_PRN}   FCSTMX       ${jday(tomorrow)}-${jday(new Date(+tomorrow + 6 * 3600000))}`,
  'B. ADVISORIES:',
  `2026900       ${msgDate(yesterday)}    ${OUT_PRN}   UNUSUFN      ${jday(yesterday)}-/`,
].join('\n');
const glotecFrame = { ...JSON.parse(FX('glotec-frame-cut.geojson')), time_tag: new Date(+now - 15 * 60000).toISOString() };
const propagated = [['time_tag', 'speed', 'density', 'temperature', 'bx', 'by', 'bz', 'bt', 'vx', 'vy', 'vz', 'propagated_time_tag']];
for (let m = 60; m >= 0; m--) propagated.push([new Date(+now - m * 60000).toISOString(), storm ? 720 : 380, 5, 1e5, 1, 2, storm ? -16 : 1, storm ? 22 : 5, -400, 0, 0, new Date(+now - m * 60000 + 52 * 60000).toISOString()]);
Object.assign(routes, {
  'kyoto-dst.json': Array.from({ length: 24 }, (_, i) => ({ time_tag: new Date(+now - (24 - i) * 3600000).toISOString().slice(0, 13) + ':00:00', dst: storm ? -60 - i * 2 : -8 })),
  'geospace_pred_est_kp_1_hour.json': Array.from({ length: 100 }, (_, i) => ({ model_prediction_time: new Date(+now + (i - 55) * 60000).toISOString().slice(0, 16) + ':00Z', k: storm ? 6.33 : 1.33 })),
  'propagated-solar-wind-1-hour.json': propagated,
  'geojson_2d_urt.json': [{ url: '/products/glotec/geojson_2d_urt/glotec_icao_TEST.geojson', time_tag: glotecFrame.time_tag }],
  'glotec_icao_TEST.geojson': glotecFrame,
  'query': JSON.parse(FX('cors-query.json')),
  'anomcus_urt.json': frames,
  'wfs_ionosphere_new.json': frames,
});
Object.assign(texts, {
  '3-day-solar-geomag-predictions.txt': FX('3-day-solar-geomag-predictions.txt'),
  'current_opsadvisory.oa1': navcenOA,
  'current_sof.sof': FX('navcen-sof-2026.xml'),
  'constellation-information': FX('gsc-constellation-table.html'),
});

const donkiEnlil = [{ simulationID: 'TEST-ENLIL', estimatedShockArrivalTime: new Date(+now + 5 * 86400000).toISOString(), isEarthGB: false, kp_18: 5, kp_90: 6, kp_135: 7, kp_180: 7, cmeInputs: [{ cmeStartTime: new Date(+now - 86400000).toISOString(), speed: 1100, halfAngle: 40 }], link: 'https://example.invalid' }];
const donkiCme = [{ time21_5: new Date(+now - 86400000).toISOString(), speed: 1100, halfAngle: 40, latitude: 5, longitude: -10, type: 'O', isMostAccurate: true }];

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const badResponses = [];
page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
// Hosts without CORS (NAVCEN, GSC) go through the local server's /api/proxy;
// answer those here too, from the same synthetic data, so nothing live leaks in.
await page.route(/\/api\/proxy\?url=/, (route) => serve(route, new URL(new URL(route.request().url()).searchParams.get('url'))));
await page.route(/^https:\/\//, (route) => serve(route, new URL(route.request().url())));
async function serve(route, u) {
  const file = u.pathname.split('/').pop();
  if (u.hostname === 'celestrak.org') return route.fulfill({ body: u.search.includes('gps-ops') ? H.syntheticGpsTLE(now) : '', contentType: 'text/plain' });
  if (u.pathname.includes('WSAEnlil')) return route.fulfill({ json: donkiEnlil });
  if (u.pathname.includes('CMEAnalysis')) return route.fulfill({ json: donkiCme });
  const cors = { 'Access-Control-Allow-Origin': '*' };
  // 1.4.0 local weather: storm day = afternoon thunderstorms in humid air plus a front; quiet day = nothing.
  if (u.hostname === 'api.weather.gov') {
    if (u.pathname.startsWith('/points/')) return route.fulfill({ json: H.nwsPoints(), headers: cors });
    if (u.pathname.startsWith('/alerts/')) return route.fulfill({ json: { type: 'FeatureCollection', features: [] }, headers: cors });
    if (u.pathname.startsWith('/gridpoints/')) {
      const hr = (t) => new Date(t).getHours();
      const front = (() => { const d = new Date(now); d.setHours(16, 0, 0, 0); return +d; })();
      return route.fulfill({
        json: storm
          ? H.nwsGridpoint(now, { thunder: (t) => (hr(t) >= 13 && hr(t) < 18 ? 60 : 10), dewC: (t) => (t >= front && t < front + 6 * 3600000 ? 16 : 23) })
          : H.nwsGridpoint(now, { thunder: () => 0, dewC: () => 15 }),
        headers: cors,
      });
    }
  }
  if (u.hostname === 'www.spc.noaa.gov') {
    const day = +(/day(\d)otlk/.exec(u.pathname)?.[1] || 1);
    return route.fulfill({ json: storm ? H.spcOutlook(now, 4, 30.42, -87.22, { dayOffset: day - 1 }) : H.spcOutlook(now, 2, 45, -100, { dayOffset: day - 1 }), headers: cors });
  }
  if (u.pathname.includes('d-rap')) return route.fulfill({ status: 404, body: 'gone' }); // exercises the image-failure path
  if (routes[file]) return route.fulfill({ json: routes[file], headers: cors });
  if (texts[file]) return route.fulfill({ body: texts[file], contentType: file === 'constellation-information' ? 'text/html' : 'text/plain', headers: cors });
  if (file.endsWith('.png')) return route.fulfill({ body: svgFrame(file), contentType: 'image/svg+xml' });
  console.log('UNROUTED', u.href);
  return route.fulfill({ status: 404, body: 'nope' });
}
const BASE = process.env.SMOKE_URL || 'http://localhost:8099/';
await page.goto(BASE);
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

// ---------------------------------------------------------------- Learn mode
const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails.push(what); };
const learnState = () => page.evaluate(() => {
  const vis = [...document.querySelectorAll('.learn')].filter((el) => el.offsetParent !== null);
  return {
    on: document.body.classList.contains('learn-on'),
    pressed: document.getElementById('learnBtn').getAttribute('aria-pressed'),
    stored: localStorage.getItem('gpsdash:learn'),
    visible: vis.length,
    emptyTopics: [...document.querySelectorAll('.learn[data-topic]')].filter((el) => !el.textContent.trim()).map((el) => el.dataset.topic),
    today: document.getElementById('todayLearn').textContent.trim().slice(0, 60),
    statLines: document.querySelectorAll('#nowStats .learn').length,
    dayLines: document.querySelectorAll('#dayCards .learn').length,
    hourLine: document.querySelector('#hourDetail .learn')?.textContent.trim().slice(0, 60) || '',
    story: document.querySelectorAll('#storySteps li').length,
    gloss: document.querySelectorAll('#glossGrid .gloss-card').length,
    quiz: document.querySelectorAll('#quiz .quiz-q').length,
    diagramW: document.querySelector('.diagram svg').getBoundingClientRect().width,
  };
});
let L1 = await learnState();
console.log('learn (default):', JSON.stringify(L1));
check(L1.on && L1.pressed === 'true' && L1.stored === null, 'Learn mode is on by default (nothing stored yet)');
check(L1.visible >= 30, `explanation boxes visible (${L1.visible})`);
check(!L1.emptyTopics.length, `every section box has text (${L1.emptyTopics.join(',') || 'none empty'})`);
check(/^Today gets an? [A-F]\./.test(L1.today), `today box: "${L1.today}"`);
check(L1.statLines === 11 && L1.dayLines >= 3 && L1.hourLine.length > 10, `tile/day/hour lines (${L1.statLines}/${L1.dayLines}, "${L1.hourLine}")`);
check(L1.story === 5 && L1.gloss === 25 && L1.quiz === 6, `Space Weather 101: ${L1.story} steps, ${L1.gloss} words, ${L1.quiz} questions`);
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({ path: `shot-${scenario}-learn-on-full.png`, fullPage: true });
await page.locator('#learn').screenshot({ path: `shot-${scenario}-learn-section.png` });

// Glossary pop-up from a word inside today's explanation (or the Kp chart box).
const termBtn = page.locator('#todayLearn .term, .learn[data-topic="kpChart"] .term').first();
const termKey = await termBtn.getAttribute('data-term');
await termBtn.click();
await page.waitForTimeout(200);
let dlg = await page.evaluate(() => ({ open: document.getElementById('termDialog').open, word: document.getElementById('termWord').textContent, text: document.getElementById('termText').textContent.length }));
check(dlg.open && dlg.word && dlg.text > 40, `glossary pop-up for "${termKey}" opens: ${dlg.word}`);
await page.screenshot({ path: `shot-${scenario}-glossary.png` });
await page.locator('#termDialog button[value="ok"]').click();
check(!(await page.evaluate(() => document.getElementById('termDialog').open)), 'Got it closes the pop-up');
await termBtn.click();
await page.locator('#termAll').click();
await page.waitForTimeout(1200);
dlg = await page.evaluate((k) => {
  const el = document.getElementById(`gloss-${k}`);
  const r = el.getBoundingClientRect();
  return { open: document.getElementById('termDialog').open, flash: el.classList.contains('flash'), inView: r.top >= 0 && r.bottom <= innerHeight };
}, termKey);
check(!dlg.open && dlg.flash && dlg.inView, 'See all words jumps to that word in the list');

// Quiz: one right answer, one wrong answer, then finish and reset.
await page.locator('#quiz .quiz-q[data-i="0"] .quiz-choice[data-j="1"]').click(); // right (answer 1)
await page.locator('#quiz .quiz-q[data-i="1"] .quiz-choice[data-j="1"]').click(); // wrong (answer 0)
const quiz = await page.evaluate(() => ({
  q0: document.querySelector('#quiz .quiz-q[data-i="0"] .quiz-why').textContent,
  q1: document.querySelector('#quiz .quiz-q[data-i="1"] .quiz-why').textContent,
  q1right: document.querySelector('#quiz .quiz-q[data-i="1"] .quiz-choice[data-j="0"]').classList.contains('right'),
  locked: document.querySelector('#quiz .quiz-q[data-i="0"] .quiz-choice[data-j="0"]').disabled,
  score: document.getElementById('quizScore').textContent,
}));
check(quiz.q0.startsWith('Right!') && quiz.q1.startsWith('Not quite.') && quiz.q1right && quiz.locked, `quiz feedback: "${quiz.q0.slice(0, 40)}" / "${quiz.q1.slice(0, 50)}"`);
check(/Score: 1 of 6/.test(quiz.score), `quiz score: "${quiz.score}"`);
for (let i = 2; i < 6; i++) await page.locator(`.quiz-q[data-i="${i}"] .quiz-choice`).first().click();
const final = await page.evaluate(() => document.getElementById('quizScore').textContent);
check(/All done! You got [0-6] of 6/.test(final), `quiz end: "${final.trim()}"`);
await page.locator('#quizScore').scrollIntoViewIfNeeded();
await page.locator('#quiz').screenshot({ path: `shot-${scenario}-quiz.png` });
await page.locator('#quizReset').click();
check(/Score: 0 of 6/.test(await page.evaluate(() => document.getElementById('quizScore').textContent)), 'Try again resets the quiz');

// ---- 1.4.0: two grades, local weather, Weather & RTK learning area, crew quizzes
const v14 = await page.evaluate(() => ({
  cols: [...document.querySelectorAll('#gradeCols .grade-col')].map((c) => c.querySelector('.mode-name').textContent + ' ' + c.querySelector('.grade').textContent),
  netHours: document.querySelectorAll('#hourStrip .hour.network').length,
  baseHours: document.querySelectorAll('#hourStrip .hour.base').length,
  wxTiles: document.querySelectorAll('#wxStats .stat').length,
  wxFirst: document.querySelector('#wxStats .stat .v')?.textContent,
  dayModes: document.querySelectorAll('#dayCards .day-mode').length,
  compare: document.querySelectorAll('#wxCompare tbody tr').length,
  myths: document.querySelectorAll('#wxMyths li').length,
  fqOptions: document.querySelectorAll('#fqSel option').length,
  fqQs: document.querySelectorAll('#fq .quiz-q').length,
}));
console.log('1.4.0:', JSON.stringify(v14));
check(v14.cols.length === 2 && /FDOT network/i.test(v14.cols[0]) && /Base \+ rover/i.test(v14.cols[1]), `two grade columns: ${v14.cols.join(' | ')}`);
check(v14.netHours > 24 && v14.netHours === v14.baseHours, `hour strip has a network row and a base row (${v14.netHours}/${v14.baseHours})`);
check(v14.dayModes === 6, `day cards show both grades (${v14.dayModes} lines)`);
check(v14.wxTiles === 6 && /%$/.test(v14.wxFirst || ''), `local weather tiles (${v14.wxTiles}, thunder ${v14.wxFirst})`);
check(v14.compare === 10 && v14.myths >= 10, `Weather & RTK learning area filled (${v14.compare} rows, ${v14.myths} myths)`);
check(v14.fqOptions === 10 && v14.fqQs === 10, `crew quiz picker: ${v14.fqOptions} quizzes, ${v14.fqQs} questions shown`);
await page.locator('#fq .quiz-q[data-i="0"] .quiz-choice[data-j="0"]').click();
const fq1 = await page.evaluate(() => document.querySelector('#fq .quiz-q[data-i="0"] .quiz-why').textContent);
check(/^(Right!|Not quite\.)/.test(fq1), `crew quiz feedback: "${fq1.slice(0, 50)}"`);
await page.selectOption('#fqSel', '4');
const fq5 = await page.evaluate(() => ({ score: document.getElementById('fqScore').textContent, first: document.querySelector('#fq .quiz-q legend').textContent }));
check(/Score: 0 of 10/.test(fq5.score), `picking quiz 5 starts fresh: "${fq5.first.slice(0, 50)}"`);

// ---------------------------------------------------------- 1.2.0 sources
await page.locator('#sats').scrollIntoViewIfNeeded();
const v12 = await page.evaluate(() => {
  const tiles = Object.fromEntries([...document.querySelectorAll('#nowStats .stat')].map((t) => [t.querySelector('.k').textContent, t.querySelector('.v').textContent]));
  return {
    tiles,
    health: document.getElementById('healthList').textContent,
    satNote: document.getElementById('satNote').textContent,
    cors: document.querySelectorAll('#corsList .item').length,
    corsFirst: document.querySelector('#corsList .item b')?.textContent,
    midLat: document.getElementById('midLat').textContent,
    arrive: document.getElementById('magArrive').textContent,
    waasHidden: document.getElementById('waasImg').hidden,
    drapHidden: document.getElementById('drapImg').hidden,
    drapNote: document.getElementById('drapImg').parentElement.querySelector('.img-note')?.textContent || '',
    players: ['glotecPlayer', 'wamPlayer'].map((id) => document.querySelector(`#${id} .player-img`)?.getAttribute('src') || ''),
    feedsFail: [...document.querySelectorAll('#feedStatus .feed.fail')].map((f) => f.textContent),
  };
});
console.log('1.2.0:', JSON.stringify(v12));
check(/TECU/.test(v12.tiles['Ionosphere (TEC)'] || ''), `TEC tile: ${v12.tiles['Ionosphere (TEC)']}`);
check(/nT/.test(v12.tiles['Dst (storm depth)'] || ''), `Dst tile: ${v12.tiles['Dst (storm depth)']}`);
check(/^\d/.test(v12.tiles['Kp next hour (model)'] || ''), `model Kp tile: ${v12.tiles['Kp next hour (model)']}`);
check(new RegExp(`Left out of PDOP now[\\s\\S]*GPS PRN ${OUT_PRN}`).test(v12.health) && new RegExp(`Scheduled[\\s\\S]*PRN ${SCHED_PRN}`).test(v12.health) && /E18 \(GSAT0201\)/.test(v12.health), `health list: PRN ${OUT_PRN} out, PRN ${SCHED_PRN} scheduled, Galileo E18 out`);
check(!/PRN 11|PRN 25/.test(v12.health), 'stale advisory lines (PRN 11, 25) are not shown as out');
check(/\+1 left out by operator notices/.test(v12.satNote), `PRN ${OUT_PRN} is overhead and left out of the count: ${v12.satNote}`);
check(v12.cors === 6, `CORS list: ${v12.cors} stations, nearest ${v12.corsFirst}`);
check(/Lower 48[\s\S]*Minor storm/.test(v12.midLat), 'mid-latitude odds table');
check(/reaches Earth at about/.test(v12.arrive), `arrival note: ${v12.arrive}`);
check(!v12.waasHidden, 'WAAS map shown');
check(v12.drapHidden && /unavailable/.test(v12.drapNote), 'failed D-RAP image hides and says so');
check(v12.players.every((s) => s.length > 0), 'GloTEC + WAM-IPE players have frames');
check(!v12.feedsFail.length, `no failed feeds (${v12.feedsFail.join(', ') || 'none'})`);
// The old D-RAP bug: after a failed image, the next refresh threw and skipped the aurora map + CME lists.
const errsBefore = errors.length;
await page.locator('#refreshBtn').click();
await page.waitForFunction(() => !document.getElementById('refreshBtn').disabled, null, { timeout: 30000 });
await page.waitForTimeout(1500);
check(errors.slice(errsBefore).every((e) => !e.startsWith('pageerror')), `refresh after a failed image throws nothing (${errors.slice(errsBefore).join(' | ') || 'clean'})`);
await page.locator('#sats').screenshot({ path: `shot-${scenario}-sats.png` });
await page.locator('#field').screenshot({ path: `shot-${scenario}-field.png` });

// Switch off, survives a reload.
await page.locator('#learnBtn').click();
let L2 = await learnState();
check(!L2.on && L2.pressed === 'false' && L2.stored === '0' && L2.visible === 0, `switch off hides every box (visible ${L2.visible}, stored ${L2.stored})`);
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({ path: `shot-${scenario}-learn-off-full.png`, fullPage: true });
await page.reload();
await page.waitForFunction(() => window.gpsdash?.state?.result, null, { timeout: 20000 });
L2 = await learnState();
check(!L2.on && L2.visible === 0, 'Learn mode stays off after a reload');

// Phone width, Learn off then on.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
const overflowOff = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await page.screenshot({ path: `shot-${scenario}-mobile.png`, fullPage: false });
await page.locator('#learnBtn').click();
await page.waitForTimeout(500);
L1 = await learnState();
const overflowOn = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const wide = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.hours')).slice(0, 5).map((el) => `${el.tagName}.${el.className}`));
check(L1.on && L1.stored === '1', 'switch back on is saved');
console.log('mobile horizontal overflow px (learn off / on):', overflowOff, '/', overflowOn, wide.length ? `wide: ${wide.join(' ')}` : '');
check(overflowOff === 0 && overflowOn === 0, 'no sideways scroll on a phone, Learn on or off');
check(L1.diagramW <= 390 && L1.diagramW > 300, `diagram fits the phone (${Math.round(L1.diagramW)} px wide)`);
await page.screenshot({ path: `shot-${scenario}-mobile-learn.png`, fullPage: false });
await page.locator('#learn .diagram').screenshot({ path: `shot-${scenario}-mobile-diagram.png` });
await page.locator('#todayLearn .term').first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: `shot-${scenario}-mobile-glossary.png`, fullPage: false });
check(await page.evaluate(() => document.getElementById('termDialog').open), 'glossary pop-up works on a phone');

console.log('console:', errors.slice(0, 20));
// Every failed request must be one this test caused on purpose (the D-RAP image).
const unexpected = badResponses.filter((r) => !/d-rap/.test(r));
check(!unexpected.length, `no unexpected failed requests (${unexpected.join(' | ') || 'none'}; ${badResponses.length} intended D-RAP 404s)`);
console.log(fails.length ? `LEARN CHECKS FAILED: ${fails.length}` : 'ALL LEARN CHECKS PASSED');
await browser.close();
// "Failed to load resource" console lines are the intended D-RAP 404s, checked above by URL.
process.exitCode = fails.length || errors.some((e) => e.startsWith('pageerror') || (e.startsWith('error') && !/Failed to load resource/.test(e))) ? 1 : 0;
