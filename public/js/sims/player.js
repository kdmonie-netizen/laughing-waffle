// Image-sequence player for NOAA SWPC model animations (WSA-Enlil, OVATION,
// LASCO coronagraph, SUVI). Frames are preloaded progressively.

export class FramePlayer {
  /**
   * @param {HTMLElement} root  container with .player-img, .player-time,
   *                            .player-range, .player-play, .player-speed
   * @param {Array<{url:string,time:Date|null}>} frames
   * @param {{maxFrames?:number, fps?:number}} opts
   */
  constructor(root, frames, { maxFrames = 120, fps = 8 } = {}) {
    this.root = root;
    this.frames = thin(frames, maxFrames);
    this.i = Math.max(0, this.frames.length - 1);
    this.fps = fps;
    this.playing = false;
    this.img = root.querySelector('.player-img');
    this.timeEl = root.querySelector('.player-time');
    this.range = root.querySelector('.player-range');
    this.playBtn = root.querySelector('.player-play');
    this.speedSel = root.querySelector('.player-speed');
    this.cache = new Map();

    if (!this.frames.length) {
      root.classList.add('empty');
      this.timeEl.textContent = 'No frames available right now';
      return;
    }
    this.range.max = this.frames.length - 1;
    this.range.value = this.i;
    this.range.addEventListener('input', () => {
      this.pause();
      this.show(+this.range.value);
    });
    this.playBtn.addEventListener('click', () => (this.playing ? this.pause() : this.play()));
    this.speedSel?.addEventListener('change', () => {
      this.fps = +this.speedSel.value;
      if (this.playing) {
        this.pause();
        this.play();
      }
    });
    this.img.addEventListener('error', () => {
      this.timeEl.textContent = 'Frame failed to load';
    });
    this.show(this.i);
    this.preload();
  }

  preload() {
    // Load from the newest frame backwards so "latest" is always ready first.
    let k = this.frames.length - 1;
    const next = () => {
      if (k < 0) return;
      const f = this.frames[k--];
      const im = new Image();
      im.onload = im.onerror = () => setTimeout(next, 30);
      im.src = f.url;
      this.cache.set(f.url, im);
    };
    for (let n = 0; n < 4; n++) next();
  }

  show(i) {
    this.i = i;
    const f = this.frames[i];
    this.img.src = f.url;
    this.range.value = i;
    this.timeEl.textContent = f.time
      ? f.time.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) +
        (f.time > new Date() ? '  (model forecast)' : '')
      : `Frame ${i + 1} / ${this.frames.length}`;
  }

  play() {
    this.playing = true;
    this.playBtn.textContent = '❚❚';
    this.playBtn.setAttribute('aria-label', 'Pause');
    this.timer = setInterval(() => this.show((this.i + 1) % this.frames.length), 1000 / this.fps);
  }

  pause() {
    this.playing = false;
    this.playBtn.textContent = '▶';
    this.playBtn.setAttribute('aria-label', 'Play');
    clearInterval(this.timer);
  }
}

function thin(frames, max) {
  if (frames.length <= max) return frames;
  const step = frames.length / max;
  const out = [];
  for (let i = 0; i < max; i++) out.push(frames[Math.floor(i * step)]);
  out[out.length - 1] = frames[frames.length - 1];
  return out;
}
