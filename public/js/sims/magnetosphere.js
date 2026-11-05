// Solar wind → magnetosphere simulation.
//
// Particles stream from the Sun at the measured (or chosen) solar-wind speed,
// coloured by IMF Bz (blue = northward, red = southward). Earth's magnetopause
// is drawn from the Shue et al. (1998) model, driven by dynamic pressure and Bz,
// with the bow shock ~30% further out. The GNSS orbit shell (~4.2 Earth radii)
// and geosynchronous orbit (6.6 Re) are drawn so you can see how hard the
// field is being pushed toward the satellites.

const PROTON_MASS_NPA = 1.6726e-6; // n[cm^-3] * v[km/s]^2 * this = P[nPa]

export function dynamicPressure(density, speed) {
  return PROTON_MASS_NPA * density * speed * speed;
}

/** Shue 1998 subsolar standoff distance r0 (Re) and flaring α. */
export function shue(bz, pdyn) {
  const p = Math.max(pdyn, 0.05);
  const r0 = (10.22 + 1.29 * Math.tanh(0.184 * (bz + 8.14))) * p ** (-1 / 6.6);
  const alpha = (0.58 - 0.007 * bz) * (1 + 0.024 * Math.log(p));
  return { r0, alpha };
}

const L1_KM = 1.5e6;
export function l1TravelMinutes(speed) {
  return speed > 0 ? L1_KM / speed / 60 : null;
}

export class MagnetosphereSim {
  constructor(canvas, readout) {
    this.canvas = canvas;
    this.readout = readout;
    this.params = { speed: 400, density: 5, bz: 0, bt: 5 };
    this.particles = [];
    this.running = true;
    this.last = performance.now();
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
    new IntersectionObserver((e) => {
      this.visible = e[0].isIntersecting;
    }).observe(canvas);
  }

  set(params) {
    Object.assign(this.params, params);
    this.updateReadout();
  }

  updateReadout() {
    const { speed, density, bz } = this.params;
    const pd = dynamicPressure(density, speed);
    const { r0 } = shue(bz, pd);
    const eta = l1TravelMinutes(speed);
    const state =
      r0 < 4.2
        ? 'Extreme: magnetopause inside the GNSS orbit shell'
        : r0 < 6.6
          ? 'Compressed inside geosynchronous orbit'
          : bz < -10
            ? 'Strong southward Bz: storm coupling'
            : bz < -5
              ? 'Southward Bz: energy loading'
              : 'Quiet to normal';
    if (this.readout) {
      this.readout.innerHTML = `
        <div><span>Dynamic pressure</span><b>${pd.toFixed(2)} nPa</b></div>
        <div><span>Magnetopause nose</span><b>${r0.toFixed(1)} R<sub>E</sub></b></div>
        <div><span>L1 → Earth travel</span><b>${eta ? Math.round(eta) + ' min' : '–'}</b></div>
        <div><span>State</span><b>${state}</b></div>`;
    }
  }

  tick(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.running && this.visible !== false) this.draw(dt);
    requestAnimationFrame(this.tick);
  }

  draw(dt) {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth;
    const H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== W * dpr || c.height !== H * dpr) {
      c.width = W * dpr;
      c.height = H * dpr;
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, W, H);

    const { speed, density, bz } = this.params;
    const pd = dynamicPressure(density, speed);
    const { r0, alpha } = shue(bz, pd);

    // Earth placement and scale: ~30 Re across the canvas, Earth at 62% width.
    const ex = W * 0.62;
    const ey = H / 2;
    const re = Math.min(W / 34, H / 18);

    // Sun glow at left edge
    const g = ctx.createRadialGradient(-W * 0.05, ey, 0, -W * 0.05, ey, H * 0.7);
    g.addColorStop(0, 'rgba(255,210,90,0.95)');
    g.addColorStop(0.25, 'rgba(255,150,40,0.35)');
    g.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W * 0.4, H);

    // Particles: count ∝ density, speed ∝ wind speed, colour by Bz.
    const target = Math.min(900, Math.round(60 + density * 25));
    while (this.particles.length < target) this.particles.push(this.spawn(W, H, true));
    if (this.particles.length > target) this.particles.length = target;
    const pxPerSec = (speed / 400) * W * 0.18;
    const col = bz < 0 ? `rgba(255,${Math.max(60, 180 + bz * 8)},${Math.max(60, 160 + bz * 8)},0.85)` : `rgba(${Math.max(80, 170 - bz * 8)},200,255,0.85)`;

    const mpR = (theta) => r0 * (2 / (1 + Math.cos(theta))) ** alpha; // Re
    const bsR = (theta) => r0 * 1.3 * (2 / (1 + Math.cos(theta))) ** (alpha * 0.9);

    ctx.fillStyle = col;
    for (const p of this.particles) {
      p.x += pxPerSec * dt * p.s;
      // deflect around the bow shock / magnetopause
      const dx = (p.x - ex) / re;
      const dy = (p.y - ey) / re;
      const r = Math.hypot(dx, dy);
      const th = Math.atan2(Math.abs(dy), -dx); // angle from the sunward axis
      const limit = bsR(Math.min(th, 2.6));
      if (r < limit && th < 2.6) {
        const push = (limit - r) * re * 0.25;
        p.y += Math.sign(dy || 1) * push;
      }
      if (p.x > W + 5) Object.assign(p, this.spawn(W, H, false));
      ctx.fillRect(p.x, p.y, 2 * p.s, 1.2);
    }

    // Bow shock and magnetopause curves
    const curve = (fn, color, width, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let i = -150; i <= 150; i += 3) {
        const th = (i * Math.PI) / 180;
        const rr = fn(Math.abs(th));
        if (!Number.isFinite(rr) || rr > 60) continue;
        const px = ex - rr * Math.cos(th) * re;
        const py = ey + rr * Math.sin(th) * re;
        if (i === -150) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve(bsR, 'rgba(255,255,255,0.25)', 1.2, [5, 5]);
    curve(mpR, bz < -5 ? 'rgba(255,110,110,0.95)' : 'rgba(120,200,255,0.95)', 2.2);

    // Dipole field lines r = L cos²λ, clipped at the magnetopause
    ctx.strokeStyle = 'rgba(160,190,255,0.35)';
    ctx.lineWidth = 1;
    for (const L of [2, 3, 4.2, 6, 8, 10]) {
      for (const side of [1, -1]) {
        ctx.beginPath();
        let started = false;
        for (let lam = -80; lam <= 80; lam += 2) {
          const lr = (lam * Math.PI) / 180;
          let rr = L * Math.cos(lr) ** 2;
          // Stretch nightside lines into a tail
          if (side < 0) rr *= 1 + (L / 6) ** 2 * 0.6;
          const sx = side * Math.cos(lr); // +1 = sunward
          const sy = Math.sin(lr);
          // Dayside lines stop at the magnetopause (open field beyond it)
          if (side > 0 && rr > mpR(Math.abs(lr)) * 0.98) {
            started = false;
            continue;
          }
          const px = ex - sx * rr * re;
          const py = ey - sy * rr * re;
          if (!started) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          started = true;
        }
        ctx.stroke();
      }
    }

    // Reference orbits
    const ring = (rRe, color, label) => {
      ctx.strokeStyle = color;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(ex, ey, rRe * re, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(label, ex + rRe * re * 0.72 + 4, ey - rRe * re * 0.72);
    };
    ring(4.17, 'rgba(120,255,170,0.8)', 'GNSS orbits');
    ring(6.6, 'rgba(255,220,120,0.7)', 'GEO');

    // Reconnection glow at the nose when Bz is south
    if (bz < -3) {
      const nx = ex - r0 * re;
      const glow = ctx.createRadialGradient(nx, ey, 0, nx, ey, re * 2.5);
      glow.addColorStop(0, `rgba(255,80,80,${Math.min(0.8, -bz / 25)})`);
      glow.addColorStop(1, 'rgba(255,80,80,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(nx, ey, re * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Earth (day side lit)
    ctx.fillStyle = '#1b3f8a';
    ctx.beginPath();
    ctx.arc(ex, ey, re, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5aa0ff';
    ctx.beginPath();
    ctx.arc(ex, ey, re, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${Math.round(speed)} km/s · ${density.toFixed(1)} p/cm³ · Bz ${bz.toFixed(1)} nT`, 10, H - 10);
    ctx.fillText('Sun →', 10, 18);
  }

  spawn(W, H, anywhere) {
    return { x: anywhere ? Math.random() * W : -Math.random() * 40, y: Math.random() * H, s: 0.6 + Math.random() * 0.8 };
  }
}
