// Test helpers: synthetic data in the exact shapes SWPC / CelesTrak publish.
// Everything here is generated for tests. It is never shown as real data.

function checksum(line) {
  let s = 0;
  for (const ch of line.slice(0, 68)) {
    if (ch >= '0' && ch <= '9') s += +ch;
    else if (ch === '-') s += 1;
  }
  return s % 10;
}

function pad(v, w, d = 0) {
  return (typeof v === 'number' ? v.toFixed(d) : String(v)).padStart(w, ' ');
}

/** Build a valid 3-line TLE for a near-circular orbit. */
export function makeTLE({ name, satnum, epoch, incl, raan, ecc = 0.005, argp = 0, ma, meanMotion }) {
  const yr = epoch.getUTCFullYear() % 100;
  const startOfYear = Date.UTC(epoch.getUTCFullYear(), 0, 1);
  const doy = (epoch.getTime() - startOfYear) / 86400000 + 1;
  const epochStr = `${String(yr).padStart(2, '0')}${doy.toFixed(8).padStart(12, '0')}`;
  let l1 = `1 ${String(satnum).padStart(5, '0')}U 00000A   ${epochStr}  .00000000  00000-0  00000-0 0  999`;
  l1 = l1.padEnd(68, ' ').slice(0, 68);
  l1 += checksum(l1);
  let l2 =
    `2 ${String(satnum).padStart(5, '0')} ${pad(incl, 8, 4)} ${pad(raan, 8, 4)} ${ecc.toFixed(7).slice(2)} ${pad(argp, 8, 4)} ${pad(ma, 8, 4)} ${meanMotion.toFixed(8).padStart(11, ' ')}    1`;
  l2 = l2.padEnd(68, ' ').slice(0, 68);
  l2 += checksum(l2);
  return `${name}\n${l1}\n${l2}`;
}

/** 30-satellite GPS-like constellation: 6 planes × 5 slots, 55°, 2 rev/day. */
export function syntheticGpsTLE(epoch = new Date()) {
  const sets = [];
  let n = 1;
  for (let plane = 0; plane < 6; plane++) {
    for (let slot = 0; slot < 5; slot++) {
      sets.push(
        makeTLE({
          name: `GPS TEST (PRN ${String(n).padStart(2, '0')})`,
          satnum: 90000 + n,
          epoch,
          incl: 55,
          raan: plane * 60,
          ma: (slot * 72 + plane * 15) % 360,
          meanMotion: 2.00563,
        }),
      );
      n++;
    }
  }
  return sets.join('\n');
}

const iso = (d) => d.toISOString().replace('T', ' ').slice(0, 19);

/** Kp forecast in the SWPC array-of-arrays shape. */
export function kpForecastArrays(now, kps) {
  const start = new Date(now);
  start.setUTCHours(Math.floor(start.getUTCHours() / 3) * 3 - 24 * 2, 0, 0, 0);
  const rows = [['time_tag', 'kp', 'observed', 'noaa_scale']];
  kps.forEach((kp, i) => {
    const t = new Date(start.getTime() + i * 3 * 3600000);
    const kind = t < now - 3 * 3600000 ? 'observed' : t <= now ? 'estimated' : 'predicted';
    rows.push([iso(t), kp.toFixed(2), kind, kp >= 5 ? `G${Math.min(5, Math.floor(kp) - 4)}` : null]);
  });
  return rows;
}

export function scalesJSON(now, { g = [0, 0, 0], rMinor = [5, 5, 5], rMajor = [1, 1, 1], sProb = [1, 1, 1] } = {}) {
  const day = (offset) => new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
  const out = {
    '-1': { DateStamp: day(-1), TimeStamp: '00:00:00', R: { Scale: '0', Text: 'none', MinorProb: null, MajorProb: null }, S: { Scale: '0', Text: 'none', Prob: null }, G: { Scale: '0', Text: 'none' } },
    0: { DateStamp: day(0), TimeStamp: '12:00:00', R: { Scale: '0', Text: 'none', MinorProb: null, MajorProb: null }, S: { Scale: '0', Text: 'none', Prob: null }, G: { Scale: '0', Text: 'none' } },
  };
  for (let i = 0; i < 3; i++) {
    out[String(i + 1)] = {
      DateStamp: day(i),
      TimeStamp: '00:00:00',
      R: { Scale: null, Text: null, MinorProb: String(rMinor[i]), MajorProb: String(rMajor[i]) },
      S: { Scale: null, Text: null, Prob: String(sProb[i]) },
      G: { Scale: String(g[i]), Text: g[i] ? 'minor' : 'none' },
    };
  }
  return out;
}

export function outlook27Text(now, rows) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lines = [
    ':Product: 27-day Space Weather Outlook Table 27DO.txt',
    `:Issued: ${now.getUTCFullYear()} ${M[now.getUTCMonth()]} ${String(now.getUTCDate()).padStart(2, '0')} 0145 UTC`,
    '# Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center',
    '#',
    '#      27-day Space Weather Outlook Table',
    '#   UTC      Radio Flux   Planetary   Largest',
    '#  Date       10.7 cm      A Index    Kp Index',
  ];
  rows.forEach(([f, ap, kp], i) => {
    const d = new Date(now.getTime() + i * 86400000);
    lines.push(`${d.getUTCFullYear()} ${M[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}     ${f}          ${String(ap).padStart(2, ' ')}          ${kp}`);
  });
  return lines.join('\n');
}

export function ap45Text(now, aps, fluxes) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const tok = (i, v) => {
    const d = new Date(now.getTime() + i * 86400000);
    return `${String(d.getUTCDate()).padStart(2, '0')}${M[d.getUTCMonth()]}${String(d.getUTCFullYear() % 100).padStart(2, '0')} ${String(v).padStart(3, '0')}`;
  };
  const block = (vals) => {
    const out = [];
    for (let i = 0; i < vals.length; i += 5) out.push(vals.slice(i, i + 5).map((v, j) => tok(i + j, v)).join(' '));
    return out.join('\n');
  };
  return [':Product: 45 Day AP Forecast  45DF.txt', ':Issued: 2026 Nov 03 2105 UTC', '45-DAY AP FORECAST', block(aps), '45-DAY F10.7 CM FLUX FORECAST', block(fluxes), 'FORECASTER: TEST'].join('\n');
}

/** NOAA's 45-day forecast in its JSON shape. */
export function ap45JSON(now, aps, fluxes) {
  const day = (i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i)).toISOString().replace('.000', '');
  const data = [];
  aps.forEach((ap, i) => {
    data.push({ time: day(i), metric: 'ap', value: ap });
    data.push({ time: day(i), metric: 'f107', value: fluxes[i] });
  });
  return { type: 'SWPC-Forecast', issued: day(0), product: '45 Day Forecast', units: { ap: 'nT', f107: 'sfu' }, data };
}

/**
 * Real-time solar wind in the json/rtsw/ shape: newest first, one row per
 * minute per spacecraft. The active spacecraft carries the values asked for;
 * an inactive decoy (ACE) carries absurd ones, so a parser that forgets the
 * `active` flag shows up at once.
 */
export function rtswWind(now, { speed = 400, density = 5 } = {}, minutes = 24 * 60) {
  const rows = [];
  for (let m = 0; m <= minutes; m++) {
    const t = iso(new Date(now.getTime() - m * 60000));
    rows.push({ time_tag: t, active: true, source: 'SOLAR1', proton_speed: +(speed + 20 * Math.sin(m / 90)).toFixed(2), proton_density: +(density + Math.sin(m / 50)).toFixed(2), proton_temperature: 90000 });
    rows.push({ time_tag: t, active: false, source: 'ACE', proton_speed: 9999, proton_density: 999, proton_temperature: 1 });
  }
  return rows;
}

export function rtswMag(now, { bz = 1, bt = 5 } = {}, minutes = 24 * 60) {
  const rows = [];
  for (let m = 0; m <= minutes; m++) {
    const t = iso(new Date(now.getTime() - m * 60000));
    rows.push({ time_tag: t, active: true, source: 'SOLAR1', bt, bx_gsm: 1, by_gsm: 2, bz_gsm: +(bz + Math.sin(m / 30)).toFixed(2) });
    rows.push({ time_tag: t, active: false, source: 'ACE', bt: 99, bx_gsm: 0, by_gsm: 0, bz_gsm: -99 });
  }
  return rows;
}

export function plasmaArrays(now, { speed = 400, density = 5 } = {}, minutes = 24 * 60) {
  const rows = [['time_tag', 'density', 'speed', 'temperature']];
  for (let m = minutes; m >= 0; m -= 1) {
    const t = new Date(now.getTime() - m * 60000);
    rows.push([iso(t) + '.000', String(density + Math.sin(m / 50)), String(speed + 20 * Math.sin(m / 90)), '90000']);
  }
  return rows;
}

export function magArrays(now, { bz = 1, bt = 5 } = {}, minutes = 24 * 60) {
  const rows = [['time_tag', 'bx_gsm', 'by_gsm', 'bz_gsm', 'lon_gsm', 'lat_gsm', 'bt']];
  for (let m = minutes; m >= 0; m -= 1) {
    const t = new Date(now.getTime() - m * 60000);
    rows.push([iso(t) + '.000', '1.0', '2.0', String(bz + Math.sin(m / 30)), '10', '5', String(bt)]);
  }
  return rows;
}
