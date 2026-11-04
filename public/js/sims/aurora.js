// OVATION Prime aurora nowcast rendered as a polar map centred on your
// hemisphere, with your location marked. Under the auroral oval GNSS phase
// scintillation and RTK fix loss become likely.

const D2R = Math.PI / 180;
let landCache = null;

export async function loadLand() {
  if (landCache) return landCache;
  try {
    const r = await fetch('vendor/land-110m.json');
    landCache = await r.json();
  } catch {
    landCache = [];
  }
  return landCache;
}

function auroraColor(p) {
  // transparent → green → yellow → red
  if (p < 3) return null;
  const t = Math.min(1, p / 70);
  const r = Math.round(t < 0.5 ? 40 + t * 2 * 215 : 255);
  const g = Math.round(t < 0.5 ? 220 : 220 - (t - 0.5) * 2 * 180);
  const b = 60;
  const a = Math.round(90 + t * 165);
  return [r, g, b, a];
}

export function drawAuroraMap(canvas, ovation, land, { lat, lon }) {
  const dpr = window.devicePixelRatio || 1;
  const S = canvas.clientWidth;
  canvas.width = S * dpr;
  canvas.height = S * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const N = S * dpr;
  const south = lat < 0;
  const hemi = south ? -1 : 1;
  const cx = N / 2;
  const cy = N / 2;
  const R = N / 2 - 4 * dpr;
  const minLat = 30;

  const project = (la, lo) => {
    const r = ((90 - la * hemi) / (90 - minLat)) * R;
    const a = (lo - lon) * D2R * hemi;
    return [cx + r * Math.sin(a), cy + r * Math.cos(a)];
  };

  // background ocean disc
  ctx.fillStyle = '#081225';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // land
  ctx.fillStyle = '#1d2a3f';
  ctx.strokeStyle = '#3a4d6b';
  ctx.lineWidth = dpr;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  for (const ring of land) {
    if (!ring.some(([, la]) => la * hemi > minLat - 15)) continue;
    ctx.beginPath();
    ring.forEach(([lo, la], i) => {
      const [x, y] = project(Math.max(la * hemi, minLat - 15) * hemi, lo);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // aurora overlay
  if (ovation) {
    const img = ctx.getImageData(0, 0, N, N);
    const d = img.data;
    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        const dx = px - cx;
        const dy = py - cy;
        const r = Math.hypot(dx, dy);
        if (r > R) continue;
        const la = (90 - (r / R) * (90 - minLat)) * hemi;
        const lo = lon + (Math.atan2(dx, dy) / D2R) * hemi;
        const c = auroraColor(ovation.at(la, lo));
        if (!c) continue;
        const k = (py * N + px) * 4;
        const a = c[3] / 255;
        d[k] = d[k] * (1 - a) + c[0] * a;
        d[k + 1] = d[k + 1] * (1 - a) + c[1] * a;
        d[k + 2] = d[k + 2] * (1 - a) + c[2] * a;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // graticule
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = dpr;
  for (const la of [40, 50, 60, 70, 80]) {
    ctx.beginPath();
    ctx.arc(cx, cy, ((90 - la) / (90 - minLat)) * R, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `${11 * dpr}px system-ui, sans-serif`;
  for (const la of [40, 50, 60, 70]) {
    ctx.fillText(`${la}°`, cx + 3 * dpr, cy + ((90 - la) / (90 - minLat)) * R - 2 * dpr);
  }

  // user marker
  const [ux, uy] = project(lat, lon);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.arc(ux, uy, 5 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillText('You', ux + 8 * dpr, uy + 4 * dpr);
}
