/* =============================================================
   ERANDA & RAMESHA — effects layer
   -------------------------------------------------------------
   Everything decorative lives here and is exposed on window.FX so
   the site logic in script.js stays readable:

     FX.burst(x, y, opts)   celebration burst from a point
     FX.shower(opts)        petals falling across the whole screen
     FX.splitChars(el)      per-letter spans
     FX.splitWords(el)      per-word spans inside overflow masks
     FX.paintGradient(el)   continuous gold gradient across split text
     FX.repaint()           re-measure gradients after a resize
   ============================================================= */

window.FX = (() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rand  = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine    = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const dpr     = () => Math.min(devicePixelRatio || 1, 2);

  const PALETTE = {
    gold:   ['#c8a253', '#f2dca4', '#8a6b2e', '#f9edcd'],
    blush:  ['#ecccc6', '#f5ded9', '#e0b3ab'],
    ivory:  ['#fbf7f0', '#f4ece0'],
  };
  const ALL_PETALS = [...PALETTE.gold, ...PALETTE.blush, ...PALETTE.ivory];

  /* ---------------------------------------------------------------
     Shape helpers — drawn in local space around (0,0)
     --------------------------------------------------------------- */
  const drawPetal = (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.55, -s * 0.65, s * 1.25, -s * 0.2, s, s * 0.45);
    ctx.bezierCurveTo(s * 0.62, s * 0.95, s * 0.2, s * 0.8, 0, 0);
    ctx.fill();
  };

  const drawLeaf = (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, -s * 0.7, s, 0);
    ctx.quadraticCurveTo(0, s * 0.7, -s, 0);
    ctx.fill();
  };

  const drawHeart = (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.2, -s * 0.5, -s * 0.35, -s * 1.15, 0, -s * 0.4);
    ctx.bezierCurveTo(s * 0.35, -s * 1.15, s * 1.2, -s * 0.5, 0, s * 0.35);
    ctx.fill();
  };

  const drawSpark = (ctx, s) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.28, Math.sin(a + Math.PI / 4) * s * 0.28);
    }
    ctx.closePath();
    ctx.fill();
  };

  const SHAPES = { petal: drawPetal, leaf: drawLeaf, heart: drawHeart, spark: drawSpark };

  /* ===============================================================
     1. AMBIENT PETALS — a slow, endless drift with mouse repulsion
     =============================================================== */
  const petals = (() => {
    const cv = $('#petalCanvas');
    if (!cv || reduced) return { start() {}, stop() {} };

    const ctx = cv.getContext('2d');
    let bits = [], raf = null, w = 0, h = 0, running = false;
    const mouse = { x: -999, y: -999 };

    const make = (seedTop) => {
      const kind = Math.random();
      const type = kind < 0.55 ? 'petal' : kind < 0.75 ? 'leaf' : kind < 0.92 ? 'bokeh' : 'spark';
      const size = type === 'bokeh' ? rand(6, 26) : rand(5, 13);
      return {
        type, size,
        x: rand(0, w),
        y: seedTop ? rand(-h * 0.4, -10) : rand(0, h),
        vx: rand(-0.22, 0.22),
        vy: type === 'bokeh' ? rand(0.05, 0.22) : rand(0.22, 0.62),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.014, 0.014),
        flip: rand(0, Math.PI * 2),
        vf: rand(0.008, 0.026),
        sway: rand(0.4, 1.5),
        phase: rand(0, Math.PI * 2),
        alpha: type === 'bokeh' ? rand(0.05, 0.16) : rand(0.35, 0.8),
        color: type === 'leaf' ? '#c9bd93'
             : type === 'bokeh' ? '#f2dca4'
             : ALL_PETALS[(Math.random() * ALL_PETALS.length) | 0]
      };
    };

    const resize = () => {
      const d = dpr();
      w = innerWidth; h = innerHeight;
      cv.width = w * d; cv.height = h * d;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const target = clamp(Math.round(w / 26), 18, 54);
      bits = Array.from({ length: target }, () => make(false));
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      const alphaScale = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--petal-alpha')) || 0.85;

      for (const b of bits) {
        b.phase += 0.01;
        b.x += b.vx + Math.sin(b.phase) * b.sway * 0.4;
        b.y += b.vy;
        b.rot += b.vr;
        b.flip += b.vf;

        // gently pushed aside by the pointer
        const dx = b.x - mouse.x, dy = b.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 18000) {
          const f = (1 - d2 / 18000) * 1.4;
          const d = Math.sqrt(d2) || 1;
          b.x += (dx / d) * f * 3;
          b.y += (dy / d) * f * 2;
        }

        if (b.y > h + 40) { Object.assign(b, make(true)); b.y = -20; }
        if (b.x < -60) b.x = w + 50;
        if (b.x > w + 60) b.x = -50;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.globalAlpha = b.alpha * alphaScale;

        if (b.type === 'bokeh') {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.size);
          g.addColorStop(0, b.color);
          g.addColorStop(1, 'rgba(242,220,164,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, b.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rotate(b.rot);
          ctx.scale(Math.cos(b.flip) * 0.75 + 0.35, 1);
          ctx.fillStyle = b.color;
          (SHAPES[b.type] || drawPetal)(ctx, b.size);
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };

    addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    addEventListener('resize', () => { if (running) resize(); });

    return {
      start() {
        if (running) return;
        running = true;
        resize();
        frame();
      },
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, w, h);
      }
    };
  })();

  /* ===============================================================
     2. BURSTS — confetti, petals and hearts thrown from a point
     =============================================================== */
  const bursts = (() => {
    const cv = $('#burstCanvas');
    if (!cv) return { fire() {}, rain() {} };

    const ctx = cv.getContext('2d');
    let parts = [], raf = null, w = 0, h = 0;

    const resize = () => {
      const d = dpr();
      w = innerWidth; h = innerHeight;
      cv.width = w * d; cv.height = h * d;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    const loop = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= 1;
        p.vy += p.g;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.flip += p.vf;

        const fade = clamp(p.life / p.fadeFrom, 0, 1);
        if (p.life <= 0 || p.y > h + 60) { parts.splice(i, 1); continue; }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade * p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'ribbon') {
          ctx.scale(Math.cos(p.flip), 1);
          ctx.fillRect(-p.size * 0.5, -p.size * 0.22, p.size, p.size * 0.44);
        } else {
          ctx.scale(Math.cos(p.flip) * 0.7 + 0.35, 1);
          (SHAPES[p.shape] || drawPetal)(ctx, p.size);
        }
        ctx.restore();
      }

      if (parts.length) raf = requestAnimationFrame(loop);
      else { cancelAnimationFrame(raf); raf = null; }
    };

    const spawn = (p) => {
      parts.push(p);
      if (parts.length > 420) parts.splice(0, parts.length - 420);
      if (!raf) raf = requestAnimationFrame(loop);
    };

    return {
      fire(x, y, opts = {}) {
        if (reduced) return;
        const {
          count = 60,
          power = 11,
          spread = Math.PI * 2,
          angle = -Math.PI / 2,
          colors = ALL_PETALS,
          shapes = ['petal', 'ribbon', 'heart', 'spark'],
          gravity = 0.16,
          size = [5, 12]
        } = opts;

        for (let i = 0; i < count; i++) {
          const a = angle + rand(-spread / 2, spread / 2);
          const v = power * rand(0.35, 1);
          spawn({
            x, y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            g: gravity * rand(0.6, 1.3),
            drag: rand(0.978, 0.992),
            rot: rand(0, Math.PI * 2),
            vr: rand(-0.24, 0.24),
            flip: rand(0, Math.PI * 2),
            vf: rand(0.04, 0.14),
            size: rand(size[0], size[1]),
            alpha: rand(0.75, 1),
            life: rand(90, 190),
            fadeFrom: 70,
            color: colors[(Math.random() * colors.length) | 0],
            shape: shapes[(Math.random() * shapes.length) | 0]
          });
        }
      },

      rain(opts = {}) {
        if (reduced) return;
        const { count = 55, colors = ALL_PETALS, shapes = ['petal', 'petal', 'heart'] } = opts;
        for (let i = 0; i < count; i++) {
          spawn({
            x: rand(0, w),
            y: rand(-h * 0.6, -10),
            vx: rand(-1.1, 1.1),
            vy: rand(1.6, 4.2),
            g: 0.012,
            drag: 0.999,
            rot: rand(0, Math.PI * 2),
            vr: rand(-0.1, 0.1),
            flip: rand(0, Math.PI * 2),
            vf: rand(0.02, 0.07),
            size: rand(5, 12),
            alpha: rand(0.6, 1),
            life: rand(170, 280),
            fadeFrom: 80,
            color: colors[(Math.random() * colors.length) | 0],
            shape: shapes[(Math.random() * shapes.length) | 0]
          });
        }
      }
    };
  })();

  /* ===============================================================
     3. CUSTOM CURSOR
     =============================================================== */
  const initCursor = () => {
    const el = $('#cursor');
    const glow = $('#cursorGlow');
    const label = $('#cursorLabel');
    if (!el || !fine || reduced) return;

    document.body.classList.add('has-cursor');

    let tx = innerWidth / 2, ty = innerHeight / 2;
    let x = tx, y = ty, gx = tx, gy = ty;

    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      el.classList.add('is-on');
      glow?.classList.add('is-on');
    }, { passive: true });

    addEventListener('pointerdown', () => el.classList.add('is-down'));
    addEventListener('pointerup',   () => el.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => { el.classList.remove('is-on'); glow?.classList.remove('is-on'); });

    const tick = () => {
      x += (tx - x) * 0.28;
      y += (ty - y) * 0.28;
      gx += (tx - gx) * 0.075;
      gy += (ty - gy) * 0.075;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(tick);
    };
    tick();

    const HOVER = 'a, button, input, textarea, select, label, [data-tilt], .dot, .flip';
    document.addEventListener('pointerover', (e) => {
      const view = e.target.closest('.shot');
      if (view) {
        label.textContent = 'View';
        el.classList.add('is-view');
        el.classList.remove('is-hover');
        return;
      }
      el.classList.remove('is-view');
      el.classList.toggle('is-hover', Boolean(e.target.closest(HOVER)));
    });
  };

  /* ===============================================================
     4. TILT · MAGNETIC · RIPPLE
     =============================================================== */
  const initTilt = () => {
    if (!fine || reduced) return;

    $$('[data-tilt]').forEach(el => {
      const strength = parseFloat(el.dataset.tilt) || 1;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
        el.style.transform =
          `perspective(900px) rotateX(${((0.5 - py) * 8 * strength).toFixed(2)}deg) ` +
          `rotateY(${((px - 0.5) * 10 * strength).toFixed(2)}deg) translateY(-6px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${(mx * 0.22).toFixed(1)}px, ${(my * 0.3).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  };

  const initRipple = () => {
    if (reduced) return;
    addEventListener('pointerdown', (e) => {
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = `${e.clientX}px`;
      r.style.top  = `${e.clientY}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 850);
    });
  };

  /* ===============================================================
     5. TEXT SPLITTING + CONTINUOUS GRADIENT PAINTING
     =============================================================== */
  const splitChars = (el) => {
    if (el.dataset.split === 'done') return;
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'u char';
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(span);
    });
    el.dataset.split = 'done';
  };

  const splitWords = (el) => {
    if (el.dataset.split === 'done') return;
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'u';
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.split = 'done';
  };

  const splitIlluminate = (el) => {
    if (el.dataset.split === 'done') return;
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'iw';
      span.style.setProperty('--i', i);
      span.textContent = word;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.split = 'done';
  };

  /* Each split unit gets a slice of one continuous, seamlessly tiling
     gold gradient — so letters keep a shared sheen while animating alone.
     Positions come from offsetLeft (layout, not transforms), so it stays
     correct even while the letters are mid-flight. */
  const painted = new Set();

  const paintGradient = (el) => {
    const units = $$('.u', el);
    if (!units.length) return;
    const base = el.offsetLeft;
    const width = el.offsetWidth || 1;
    el.style.setProperty('--gw', `${Math.max(width * 1.35, 260).toFixed(0)}px`);
    units.forEach(u => u.style.setProperty('--cx', `${(u.offsetLeft - base).toFixed(1)}px`));
    el.classList.add('is-painted');
    painted.add(el);
  };

  let repaintTimer = null;
  const repaint = () => {
    clearTimeout(repaintTimer);
    repaintTimer = setTimeout(() => painted.forEach(paintGradient), 120);
  };
  addEventListener('resize', repaint);

  /* ===============================================================
     6. BOOT
     =============================================================== */
  const init = () => {
    initCursor();
    initTilt();
    initRipple();
  };

  return {
    reduced, fine, rand, clamp,
    palette: PALETTE,
    petals,
    burst:  (x, y, o) => bursts.fire(x, y, o),
    shower: (o) => bursts.rain(o),
    splitChars, splitWords, splitIlluminate,
    paintGradient, repaint,
    init
  };
})();
