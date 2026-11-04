// CME arrival: NASA DONKI catalogue + WSA-Enlil run results, and a
// Drag-Based Model (Vršnak et al. 2013) calculator with a top-down animation.

const AU_KM = 149597870.7;
const RSUN_KM = 695700;

/**
 * Analytic DBM: distance (km) and speed (km/s) at time t (s) after the CME
 * passes r0, for initial speed v0, ambient wind w and drag parameter γ (1/km).
 */
export function dbm(t, { v0, w, gamma, r0 = 21.5 * RSUN_KM }) {
  const dv = v0 - w;
  const s = dv >= 0 ? 1 : -1;
  const q = 1 + s * gamma * dv * t;
  const r = (s / gamma) * Math.log(q) + w * t + r0;
  const v = dv / q + w;
  return { r, v };
}

/** Transit time to 1 AU (hours) and impact speed. */
export function dbmArrival({ v0, w, gamma, r0 = 21.5 * RSUN_KM, target = AU_KM }) {
  let lo = 0;
  let hi = 10 * 86400;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (dbm(mid, { v0, w, gamma, r0 }).r < target) lo = mid;
    else hi = mid;
  }
  const { v } = dbm(hi, { v0, w, gamma, r0 });
  return { hours: hi / 3600, speed: v };
}

/** Parse DONKI WSA-Enlil simulations into predicted Earth arrivals. */
export function enlilEarthArrivals(sims) {
  if (!Array.isArray(sims)) return [];
  const out = [];
  for (const s of sims) {
    const earthImpacts = (s.impactList || []).filter((i) => /earth/i.test(i.location || ''));
    const arrival = s.estimatedShockArrivalTime || earthImpacts[0]?.arrivalTime;
    if (!arrival) continue;
    const cme = (s.cmeInputs || [])[0] || {};
    out.push({
      arrival: new Date(arrival),
      glancing: !!(s.isEarthGB || earthImpacts[0]?.isGlancingBlow),
      kpEstimate: [s.kp_18, s.kp_90, s.kp_135, s.kp_180].filter((k) => k != null),
      duration: s.estimatedDuration,
      cmeTime: cme.cmeStartTime ? new Date(cme.cmeStartTime) : null,
      speed: cme.speed,
      halfAngle: cme.halfAngle,
      id: s.simulationID,
      link: s.link,
    });
  }
  // Keep the latest run per arrival-hour.
  const seen = new Map();
  for (const a of out.sort((x, y) => y.arrival - x.arrival)) {
    const k = Math.round(a.arrival / 3600000);
    if (!seen.has(k)) seen.set(k, a);
  }
  return [...seen.values()].sort((a, b) => a.arrival - b.arrival);
}

/** DONKI CME analyses (most-accurate only), newest first. */
export function cmeAnalyses(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c.isMostAccurate !== false && c.speed)
    .map((c) => ({
      time: c.time21_5 ? new Date(c.time21_5) : null,
      speed: c.speed,
      halfAngle: c.halfAngle,
      lat: c.latitude,
      lon: c.longitude,
      type: c.type,
      note: c.note,
      id: c.associatedCMEID,
      link: c.link,
    }))
    .filter((c) => c.time)
    .sort((a, b) => b.time - a.time);
}

/** Top-down Sun–Earth plane animation of a DBM run. */
export class CmeAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.run = null;
    this.t = 0;
    this.last = performance.now();
    requestAnimationFrame(this.frame.bind(this));
  }

  set(run) {
    this.run = run;
    this.t = 0;
  }

  frame(now) {
    const dt = (now - this.last) / 1000;
    this.last = now;
    this.draw(dt);
    requestAnimationFrame(this.frame.bind(this));
  }

  draw(dt) {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth;
    const H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== W * dpr) {
      c.width = W * dpr;
      c.height = H * dpr;
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, W, H);
    const sx = W * 0.12;
    const sy = H / 2;
    const au = W * 0.72;

    // Earth orbit arc
    ctx.strokeStyle = 'rgba(120,170,255,0.35)';
    ctx.beginPath();
    ctx.arc(sx, sy, au, -0.5, 0.5);
    ctx.stroke();
    // Sun
    ctx.fillStyle = '#ffc94d';
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
    // Earth
    ctx.fillStyle = '#5aa0ff';
    ctx.beginPath();
    ctx.arc(sx + au, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('Earth', sx + au - 14, sy + 20);
    ctx.fillText('Sun', sx - 10, sy + 26);

    if (!this.run) return;
    const { v0, w, gamma, hours, halfAngle = 30 } = this.run;
    // Animate whole transit in ~8 s, hold 2 s.
    this.t = (this.t + dt) % 10;
    const frac = Math.min(1, this.t / 8);
    const tSec = frac * hours * 3600;
    const { r, v } = dbm(tSec, { v0, w, gamma });
    const rr = (r / AU_KM) * au;
    const ha = (halfAngle * Math.PI) / 180;
    const grad = ctx.createRadialGradient(sx, sy, rr * 0.7, sx, sy, rr);
    grad.addColorStop(0, 'rgba(255,120,60,0)');
    grad.addColorStop(1, 'rgba(255,140,80,0.7)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, rr, -ha, ha);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,110,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, rr, -ha, ha);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(`t + ${(tSec / 3600).toFixed(0)} h · ${Math.round(v)} km/s`, 10, 16);
  }
}
