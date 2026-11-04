// Minimal dependency-free canvas time-series charts with hover readout.

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function kpColor(kp) {
  if (kp >= 7) return css('--bad');
  if (kp >= 5) return css('--poor');
  if (kp >= 4) return css('--fair');
  return css('--good');
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} cfg
 *   series: [{label, color, points:[{time, value}], type:'line'|'bar', barWidthMs, colorFn}]
 *   yMin, yMax, log, yTicks, yFormat, thresholds:[{value,label,color}], now:Date, xMin, xMax
 */
export function drawChart(canvas, cfg) {
  const render = () => paint(canvas, cfg);
  render();
  if (!canvas._ro) {
    canvas._ro = new ResizeObserver(() => paint(canvas, canvas._cfg));
    canvas._ro.observe(canvas);
    canvas.addEventListener('mousemove', (e) => hover(canvas, e));
    canvas.addEventListener('mouseleave', () => {
      canvas._hoverX = null;
      paint(canvas, canvas._cfg);
    });
  }
  canvas._cfg = cfg;
}

function hover(canvas, e) {
  const r = canvas.getBoundingClientRect();
  canvas._hoverX = e.clientX - r.left;
  paint(canvas, canvas._cfg);
}

function paint(canvas, cfg) {
  if (!cfg) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 46, r: 12, t: 10, b: 24 };
  const all = cfg.series.flatMap((s) => s.points).filter((p) => p.value != null && p.time);
  if (!all.length) {
    ctx.fillStyle = css('--muted');
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('No data', pad.l, H / 2);
    return;
  }
  const xMin = cfg.xMin ?? Math.min(...all.map((p) => +p.time));
  const xMax = cfg.xMax ?? Math.max(...all.map((p) => +p.time + (cfg.series.find((s) => s.type === 'bar')?.barWidthMs || 0)));
  const vals = all.map((p) => p.value);
  let yMin = cfg.yMin ?? Math.min(...vals);
  let yMax = cfg.yMax ?? Math.max(...vals);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const ty = cfg.log ? (v) => Math.log10(Math.max(v, 1e-12)) : (v) => v;
  const Y0 = ty(yMin);
  const Y1 = ty(yMax);
  const x = (t) => pad.l + ((t - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (ty(v) - Y0) / (Y1 - Y0)) * (H - pad.t - pad.b);

  // grid + y labels
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = css('--muted');
  ctx.strokeStyle = css('--grid');
  ctx.lineWidth = 1;
  const ticks = cfg.yTicks || niceTicks(yMin, yMax, cfg.log);
  for (const tv of ticks) {
    const yy = y(tv);
    if (yy < pad.t - 1 || yy > H - pad.b + 1) continue;
    ctx.beginPath();
    ctx.moveTo(pad.l, yy);
    ctx.lineTo(W - pad.r, yy);
    ctx.stroke();
    ctx.fillText(cfg.yFormat ? cfg.yFormat(tv) : String(tv), 4, yy + 4);
  }
  // x labels: day boundaries and every 6 h
  const span = xMax - xMin;
  const step = span > 4 * 86400000 ? 86400000 : span > 36 * 3600000 ? 12 * 3600000 : span > 12 * 3600000 ? 6 * 3600000 : 3 * 3600000;
  const first = Math.ceil(xMin / step) * step;
  for (let t = first; t <= xMax; t += step) {
    const xx = x(t);
    const d = new Date(t);
    const label =
      step >= 86400000
        ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : d.getHours() === 0
          ? d.toLocaleDateString(undefined, { weekday: 'short' })
          : d.toLocaleTimeString(undefined, { hour: 'numeric' });
    ctx.fillText(label, xx - 14, H - 6);
    ctx.beginPath();
    ctx.moveTo(xx, pad.t);
    ctx.lineTo(xx, H - pad.b);
    ctx.stroke();
  }

  // thresholds
  for (const th of cfg.thresholds || []) {
    const yy = y(th.value);
    ctx.strokeStyle = th.color || css('--fair');
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, yy);
    ctx.lineTo(W - pad.r, yy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = th.color || css('--fair');
    ctx.fillText(th.label, W - pad.r - ctx.measureText(th.label).width - 2, yy - 3);
  }

  // series
  for (const s of cfg.series) {
    const pts = s.points.filter((p) => p.value != null && p.time);
    if (s.type === 'bar') {
      const bw = Math.max(1, x(xMin + s.barWidthMs) - x(xMin) - 1);
      for (const p of pts) {
        ctx.fillStyle = s.colorFn ? s.colorFn(p) : s.color;
        ctx.globalAlpha = p.alpha ?? 1;
        const yy = y(p.value);
        ctx.fillRect(x(+p.time) + 0.5, yy, bw, y(yMin) - yy);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      let last = null;
      for (const p of pts) {
        const xx = x(+p.time);
        const yy = y(p.value);
        // break the line across data gaps > 15 min
        if (!started || (last && p.time - last > 15 * 60000)) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
        started = true;
        last = p.time;
      }
      ctx.stroke();
    }
  }

  // now marker
  if (cfg.now) {
    const xx = x(+cfg.now);
    if (xx >= pad.l && xx <= W - pad.r) {
      ctx.strokeStyle = css('--accent');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xx, pad.t);
      ctx.lineTo(xx, H - pad.b);
      ctx.stroke();
      ctx.fillStyle = css('--accent');
      ctx.fillText('now', xx + 3, pad.t + 10);
    }
  }

  // hover readout
  if (canvas._hoverX != null && canvas._hoverX > pad.l) {
    const t = xMin + ((canvas._hoverX - pad.l) / (W - pad.l - pad.r)) * (xMax - xMin);
    ctx.strokeStyle = css('--muted');
    ctx.beginPath();
    ctx.moveTo(canvas._hoverX, pad.t);
    ctx.lineTo(canvas._hoverX, H - pad.b);
    ctx.stroke();
    const lines = [new Date(t).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })];
    for (const s of cfg.series) {
      const p = nearest(s.points, t, s.type === 'bar' ? s.barWidthMs : 0);
      if (p) lines.push(`${s.label}: ${cfg.yFormat && cfg.log ? cfg.yFormat(p.value) : fmt(p.value)}${p.note ? ` (${p.note})` : ''}`);
    }
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12;
    const bx = Math.min(canvas._hoverX + 8, W - bw - 4);
    ctx.fillStyle = css('--panel-2');
    ctx.fillRect(bx, pad.t + 4, bw, lines.length * 15 + 6);
    ctx.fillStyle = css('--text');
    lines.forEach((l, i) => ctx.fillText(l, bx + 6, pad.t + 18 + i * 15));
  }
}

function fmt(v) {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function nearest(points, t, barWidth) {
  let best = null;
  let bd = Infinity;
  for (const p of points) {
    if (p.value == null) continue;
    if (barWidth && t >= +p.time && t < +p.time + barWidth) return p;
    const d = Math.abs(+p.time - t);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return bd < 30 * 60000 || barWidth ? best : null;
}

function niceTicks(min, max, log) {
  if (log) {
    const out = [];
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) out.push(10 ** e);
    return out;
  }
  const span = max - min;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const stepN = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / stepN) * stepN; v <= max + 1e-9; v += stepN) out.push(+v.toFixed(6));
  return out;
}
