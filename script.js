/* =============================================================
   ERANDA & RAMESHA — site logic
   -------------------------------------------------------------
   1.  Setup
   2.  Preloader
   3.  Opening: dust canvas + envelope sequence
   4.  Text splitting + gradient painting
   5.  Reveal on scroll
   6.  Scroll engine (one rAF loop)
   7.  Section rail
   8.  Theme switch
   9.  Ribbon marquee
   10. Countdown dials
   11. Flip cards
   12. Gallery lightbox
   13. Guestbook
   14. RSVP wizard
   15. Add to calendar
   16. Music (your own track, or a score the page performs itself)
   ============================================================= */

(() => {
  'use strict';

  /* ========================= 1. SETUP ======================== */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rand  = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  const reduced = FX.reduced;
  const body = document.body;

  /** The big day, and the day the countdown starts filling from. */
  const WEDDING_DATE = new Date('2026-12-12T16:30:00');
  const COUNT_FROM   = new Date('2025-12-12T16:30:00');

  const WEDDING = {
    title: 'Eranda & Ramesha — Wedding',
    location: 'The Grand Ballroom, Colombo, Sri Lanka',
    details: 'Poruwa ceremony at 4:30pm, reception from 7:00pm. Black tie, champagne tones.',
    start: WEDDING_DATE,
    end:   new Date('2026-12-12T23:30:00')
  };

  if (window.CSS && CSS.registerProperty) document.documentElement.classList.add('can-prop');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  FX.init();

  /* ======================= 2. PRELOADER ====================== */
  const preloader = $('#preloader');
  const preFill   = $('#preFill');
  const preCount  = $('#preCount');

  const runPreloader = () => new Promise(resolve => {
    if (!preloader) return resolve();

    let shown = 0;              // what the user sees
    let target = 8;             // what we've actually achieved
    const started = performance.now();
    const minimum = reduced ? 300 : 1600;

    const assetsReady = Promise.all([
      new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))),
      document.fonts ? document.fonts.ready : Promise.resolve()
    ]).then(() => { target = 100; });

    const step = () => {
      // creep towards the target so the bar never sits frozen
      target = Math.min(100, Math.max(target, (performance.now() - started) / minimum * 92));
      shown += (target - shown) * 0.08 + 0.15;

      const value = Math.min(100, Math.round(shown));
      if (preFill) preFill.style.width = `${value}%`;
      if (preCount) preCount.textContent = value;

      if (value >= 100 && performance.now() - started >= minimum) {
        preloader.classList.add('is-done');
        setTimeout(() => { preloader.hidden = true; resolve(); }, 900);
        return;
      }
      requestAnimationFrame(step);
    };

    void assetsReady;
    requestAnimationFrame(step);
  });

  /* ============= 3. OPENING: DUST + ENVELOPE ================= */
  const opening  = $('#opening');
  const envelope = $('#envelope');
  const canvas   = $('#dustCanvas');

  const startDust = () => {
    if (!canvas || reduced) return () => {};
    const ctx = canvas.getContext('2d');
    let motes = [], raf = null, w = 0, h = 0;

    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * d;
      h = canvas.height = innerHeight * d;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      const count = Math.round(clamp(innerWidth / 12, 50, 130));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.5, 2.2) * d,
        vx: rand(-0.18, 0.18) * d,
        vy: rand(-0.38, -0.06) * d,
        a: rand(0.15, 0.75),
        tw: rand(0.004, 0.018)
      }));
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy; m.a += m.tw;
        if (m.a > 0.85 || m.a < 0.12) m.tw *= -1;
        if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;

        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
        g.addColorStop(0, `rgba(242,220,164,${m.a})`);
        g.addColorStop(1, 'rgba(242,220,164,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    frame();
    addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  };

  let stopDust = () => {};
  let opened = false;

  const openInvitation = () => {
    if (opened) return;
    opened = true;

    envelope.classList.add('is-opening');
    envelope.setAttribute('aria-expanded', 'true');

    const seal = $('.envelope__seal');
    const sealRect = seal ? seal.getBoundingClientRect() : null;

    // wax shards where the seal cracks apart
    if (sealRect && !reduced) {
      setTimeout(() => {
        FX.burst(sealRect.left + sealRect.width / 2, sealRect.top + sealRect.height / 2, {
          count: 26, power: 7, spread: Math.PI * 2, gravity: 0.3,
          colors: ['#d9b463', '#a37f34', '#6f5320'],
          shapes: ['ribbon', 'spark'], size: [3, 7]
        });
      }, 420);
    }

    // the camera pushes in, the light blooms, petals go everywhere
    setTimeout(() => {
      $('#openFlash')?.classList.add('is-firing');
      $('#openShock')?.classList.add('is-firing');
      FX.burst(innerWidth / 2, innerHeight / 2, {
        count: 70, power: 15, spread: Math.PI * 2, gravity: 0.11,
        shapes: ['petal', 'petal', 'heart', 'spark']
      });
      FX.shower({ count: 50 });
      opening.classList.add('is-open');
    }, reduced ? 100 : 1500);

    setTimeout(() => {
      body.classList.remove('is-locked');
      body.classList.add('is-revealed');
      $('#site').setAttribute('aria-hidden', 'false');
      $$('.hero [data-chars], .hero [data-hand]').forEach(el => el.classList.add('is-written'));
      opening.setAttribute('hidden', '');
      stopDust();
      FX.petals.start();

      // Always arrive at the top of the invitation, whatever the browser
      // restored or the reader nudged while the envelope was on screen.
      scrollTo({ top: 0, left: 0, behavior: 'auto' });
      requestScroll();

      // The envelope click counts as the gesture that unlocks audio.
      startMusic();
    }, reduced ? 400 : 2900);
  };

  envelope?.addEventListener('click', openInvitation);

  /* ============ 4. TEXT SPLITTING + GRADIENTS ================ */
  $$('[data-split]').forEach(FX.splitChars);
  $$('[data-chars]').forEach(el => {
    FX.splitChars(el);
    if (el.dataset.charsDelay) el.style.setProperty('--d', `${el.dataset.charsDelay}s`);
  });
  $$('[data-words]').forEach(FX.splitWords);
  $$('[data-illuminate]').forEach(FX.splitIlluminate);

  const paintAll = () => $$('.grad').forEach(el => {
    if (el.querySelector('.u')) FX.paintGradient(el);
  });
  paintAll();
  if (document.fonts) document.fonts.ready.then(() => { paintAll(); FX.repaint(); });

  /* ================= 5. REVEAL ON SCROLL ===================== */
  $$('.cards .flip, .masonry .shot, .agenda .agenda__item').forEach((el, i) => {
    el.style.setProperty('--delay', `${(i % 6) * 0.08}s`);
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  $$('[data-reveal], [data-words]').forEach(el => revealObserver.observe(el));

  /* Script names are clipped to zero width until they are "written", and a
     zero-area box never counts as intersecting — so watch a stable ancestor
     and write the names it owns. */
  const handTargets = new Map();

  const handObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      (handTargets.get(entry.target) || []).forEach(el => el.classList.add('is-written'));
      handObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  $$('[data-hand], [data-chars]').forEach(el => {
    if (el.closest('.hero')) return;
    const watcher = el.parentElement || el;
    if (!handTargets.has(watcher)) {
      handTargets.set(watcher, []);
      handObserver.observe(watcher);
    }
    handTargets.get(watcher).push(el);
  });

  /* ================= 6. SCROLL ENGINE ======================== */
  const progressBar  = $('#progressBar');
  const parallaxEls  = $$('[data-parallax]');
  const timeline     = $('#timeline');
  const timelineFill = $('#timelineFill');
  const comet        = $('#timelineComet');
  const quotes       = $$('[data-quote]');
  const topbar       = $('#topbar');
  const toTop        = $('#toTop');
  const topBar       = $('#topBar');
  const navSections  = $$('[data-nav]');

  let dots = [];
  let ticking = false;
  let activeDot = -1;

  const onScrollFrame = () => {
    const vh = innerHeight;
    const y  = scrollY;
    const max = document.documentElement.scrollHeight - vh;
    const ratio = clamp(y / (max || 1), 0, 1);

    if (progressBar) progressBar.style.width = `${(ratio * 100).toFixed(2)}%`;
    if (topBar) topBar.style.strokeDashoffset = `${132 * (1 - ratio)}`;

    topbar?.classList.toggle('is-stuck', y > 40);
    toTop?.classList.toggle('is-shown', y > vh * 0.9);

    // Uses the standalone `translate` property, not `transform`, so it can
    // coexist with the hero's entrance animations instead of being overruled.
    if (!reduced) {
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
        el.style.translate = `0 ${(-offset).toFixed(2)}px`;
      });
    }

    if (timeline && timelineFill) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      timelineFill.style.height = `${(p * 100).toFixed(2)}%`;
      if (comet) {
        comet.style.top = `${(p * 100).toFixed(2)}%`;
        comet.classList.toggle('is-on', p > 0.01 && p < 0.99);
      }
    }

    quotes.forEach(q => {
      const r = q.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2);
      q.classList.toggle('is-lit', dist < 0.62);
    });

    if (dots.length) {
      let current = 0;
      navSections.forEach((sec, i) => {
        if (sec.getBoundingClientRect().top <= vh * 0.42) current = i;
      });
      if (current !== activeDot) {
        dots[activeDot]?.classList.remove('is-active');
        dots[current]?.classList.add('is-active');
        activeDot = current;
      }
    }

    ticking = false;
  };

  function requestScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScrollFrame);
  }

  addEventListener('scroll', requestScroll, { passive: true });
  addEventListener('resize', requestScroll);

  toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  /* ==================== 7. SECTION RAIL ====================== */
  const dotsNav = $('#dots');
  if (dotsNav) {
    navSections.forEach(sec => {
      const a = document.createElement('a');
      a.className = 'dot';
      a.href = `#${sec.id}`;
      a.setAttribute('aria-label', sec.dataset.nav);
      a.innerHTML = `<span class="dot__label">${sec.dataset.nav}</span>`;
      dotsNav.appendChild(a);
    });
    dots = $$('.dot', dotsNav);
  }

  /* ===================== 8. THEME SWITCH ===================== */
  const themeToggle = $('#themeToggle');
  const themeIcon   = $('#themeIcon');
  const themeMeta   = $('meta[name="theme-color"]');
  const THEME_KEY   = 'er-theme';

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const night = theme === 'night';
    if (themeIcon) themeIcon.className = night ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    themeToggle?.setAttribute('aria-pressed', String(night));
    themeToggle?.setAttribute('aria-label', night ? 'Switch to daylight theme' : 'Switch to evening theme');
    if (themeMeta) themeMeta.content = night ? '#100c09' : '#fdfaf5';
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
  };

  // Candlelit night is the default; a visitor's own choice wins next time.
  let savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
  applyTheme(savedTheme === 'day' ? 'day' : 'night');

  themeToggle?.addEventListener('click', (e) => {
    const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    applyTheme(next);
    const r = themeToggle.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, {
      count: 18, power: 6, gravity: 0.08, size: [3, 7],
      shapes: ['spark'], colors: next === 'night' ? ['#f2dca4', '#fff8e6'] : ['#c8a253', '#ecccc6']
    });
  });

  /* ==================== 9. RIBBON MARQUEE ==================== */
  $$('.ribbon__row').forEach(row => {
    const track = $('.ribbon__track', row);
    if (!track) return;
    row.appendChild(track.cloneNode(true));   // one exact copy → seamless -50% loop
    const speed = clamp(track.scrollWidth / 42, 22, 70);
    row.style.setProperty('--speed', `${speed.toFixed(1)}s`);
  });

  /* ==================== 10. COUNTDOWN ======================== */
  const CIRC = 2 * Math.PI * 52;
  const cd = {
    days:  { num: $('#cdDays'),  dial: $('#dialDays') },
    hours: { num: $('#cdHours'), dial: $('#dialHours') },
    mins:  { num: $('#cdMins'),  dial: $('#dialMins') },
    secs:  { num: $('#cdSecs'),  dial: $('#dialSecs') }
  };

  Object.values(cd).forEach(u => {
    if (u.dial) u.dial.style.strokeDasharray = CIRC.toFixed(1);
  });

  const setUnit = (unit, value, fraction) => {
    if (unit.dial) unit.dial.style.strokeDashoffset = (CIRC * (1 - clamp(fraction, 0, 1))).toFixed(1);
    const text = String(value).padStart(2, '0');
    const node = unit.num;
    if (!node || node.textContent === text) return;
    node.textContent = text;
    node.classList.remove('is-tick');
    void node.offsetWidth;
    node.classList.add('is-tick');
  };

  const totalSpan = Math.max(1, (WEDDING_DATE - COUNT_FROM) / 86400000);

  const tick = () => {
    const diff = WEDDING_DATE - Date.now();

    if (diff <= 0) {
      Object.values(cd).forEach(u => setUnit(u, 0, 0));
      const note = $('.clock__note');
      if (note) note.textContent = 'Today is the day.';
      return;
    }

    const s = Math.floor(diff / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor(s / 3600) % 24;
    const mins = Math.floor(s / 60) % 60;
    const secs = s % 60;

    setUnit(cd.days,  days,  days / totalSpan);
    setUnit(cd.hours, hours, hours / 24);
    setUnit(cd.mins,  mins,  mins / 60);
    setUnit(cd.secs,  secs,  secs / 60);
  };
  tick();
  setInterval(tick, 1000);

  /* ===================== 11. FLIP CARDS ====================== */
  $$('.flip').forEach(card => {
    const flip = () => card.classList.toggle('is-flipped');
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;   // let the buttons on the back work
      flip();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    });
  });

  /* =================== 12. GALLERY LIGHTBOX ================== */
  const shots    = $$('.shot');
  const lightbox = $('#lightbox');
  const lbFrame  = $('#lbFrame');
  const lbCap    = $('#lbCaption');
  const lbCount  = $('#lbCount');
  let lbIndex = 0, lastFocus = null;

  const showShot = (i) => {
    if (!shots.length) return;
    lbIndex = (i + shots.length) % shots.length;
    const shot = shots[lbIndex];
    const src = shot.dataset.src || $('img', shot)?.getAttribute('src');

    lbFrame.classList.add('is-swapping');
    setTimeout(() => {
      lbFrame.innerHTML = src
        ? `<img src="${src}" alt="${shot.dataset.caption || 'Photograph'}" />`
        : '<i class="fa-regular fa-image"></i>';
      lbFrame.classList.remove('is-swapping');
    }, 180);

    lbCap.textContent = shot.dataset.caption || '';
    lbCount.textContent = `${lbIndex + 1} / ${shots.length}`;
  };

  const openLightbox = (i) => {
    lastFocus = document.activeElement;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    body.style.overflow = 'hidden';
    showShot(i);
    $('#lbClose').focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    body.style.overflow = '';
    setTimeout(() => { lightbox.hidden = true; lastFocus?.focus(); }, 450);
  };

  shots.forEach((shot, i) => {
    shot.setAttribute('tabindex', '0');
    shot.setAttribute('role', 'button');
    shot.addEventListener('click', () => openLightbox(i));
    shot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  $('#lbClose')?.addEventListener('click', closeLightbox);
  $('#lbPrev')?.addEventListener('click', () => showShot(lbIndex - 1));
  $('#lbNext')?.addEventListener('click', () => showShot(lbIndex + 1));
  lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showShot(lbIndex + 1);
    if (e.key === 'ArrowLeft') showShot(lbIndex - 1);
  });

  // swipe on touch
  if (lightbox) {
    let sx = 0;
    lightbox.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 60) showShot(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ===================== 13. GUESTBOOK ======================= */
  const wall = $('#wishWall');
  const wishForm = $('#wishForm');
  const WISH_KEY = 'er-wishes';

  const seedWishes = [
    { name: 'Amma & Thaththa', from: 'Kandy', msg: 'We have watched you both grow into the people you are. Go gently, love loudly, and come home often.' },
    { name: 'Nadeesha',        from: 'London', msg: 'From hostel noodles to a wedding invitation. So proud of you both — save me a dance.' },
    { name: 'The Silvas',      from: 'Galle',  msg: 'May your home always be full of laughter, and your kitchen always full of people.' },
    { name: 'Kasun',           from: 'Colombo', msg: 'Finally! We have been waiting for this since 2019. Congratulations, machan.' }
  ];

  const loadWishes = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
      return [...seedWishes, ...saved];
    } catch (e) { return seedWishes; }
  };

  const wishCard = (w, i, isNew) => {
    const el = document.createElement('article');
    el.className = `wish${isNew ? ' wish--new' : ''}`;
    el.style.setProperty('--i', i);
    el.innerHTML = `
      <span class="wish__quote" aria-hidden="true">&ldquo;</span>
      <p class="wish__msg"></p>
      <span class="wish__by"></span>
      <span class="wish__from"></span>`;
    $('.wish__msg', el).textContent = w.msg;
    $('.wish__by', el).textContent = w.name;
    $('.wish__from', el).textContent = w.from || '';
    return el;
  };

  const renderWishes = () => {
    if (!wall) return;
    wall.textContent = '';
    loadWishes().forEach((w, i) => wall.appendChild(wishCard(w, i, false)));
  };
  renderWishes();

  wishForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#wName').value.trim();
    const from = $('#wFrom').value.trim();
    const msg  = $('#wMsg').value.trim();

    if (name.length < 2 || msg.length < 4) {
      [['#wName', name.length >= 2], ['#wMsg', msg.length >= 4]].forEach(([sel, ok]) => {
        $(sel).closest('.field').classList.toggle('has-error', !ok);
      });
      return;
    }

    try {
      const saved = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
      saved.push({ name, from, msg });
      localStorage.setItem(WISH_KEY, JSON.stringify(saved));
    } catch (err) { /* storage unavailable — the card still appears for this visit */ }

    const card = wishCard({ name, from, msg }, 0, true);
    wall.prepend(card);
    wishForm.reset();
    $$('.field', wishForm).forEach(f => f.classList.remove('has-error'));

    const r = card.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + 20, {
      count: 30, power: 8, gravity: 0.12, shapes: ['heart', 'petal', 'spark']
    });
    card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  });

  /* ==================== 14. RSVP WIZARD ====================== */
  const form     = $('#rsvpForm');
  const track    = $('#wizTrack');
  const viewport = $('#wizViewport');
  const panels   = $$('.wizard__panel');
  const stepsUI  = $$('#wizSteps li');
  const wizBar   = $('#wizBar');
  const btnPrev  = $('#wizPrev');
  const btnNext  = $('#wizNext');
  const btnSend  = $('#wizSend');
  const wizDone  = $('#wizDone');
  const status   = $('#formStatus');
  const summary  = $('#wizSummary');
  const stepper  = $('#guestStepper');
  const guestVal = $('#guestValue');
  const guestInp = $('#rGuests');

  let step = 0;
  let guests = 1;

  const setError = (input, message) => {
    const field = input.closest('.field');
    field?.classList.toggle('has-error', Boolean(message));
    const slot = field?.querySelector('.field__error');
    if (slot) slot.textContent = message || '';
    return !message;
  };

  const validators = {
    rName:  (v) => v.trim().length >= 2 ? '' : 'Please enter your full name.',
    rPhone: (v) => /^[+\d][\d\s()-]{6,}$/.test(v.trim()) ? '' : 'Enter a number we can reach you on.'
  };

  Object.keys(validators).forEach(id => {
    const input = $(`#${id}`);
    if (!input) return;
    input.addEventListener('blur', () => setError(input, validators[id](input.value)));
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('has-error')) setError(input, validators[id](input.value));
    });
  });

  const attending = () => $('input[name="attending"]:checked')?.value || '';

  const validateStep = (n) => {
    if (n === 0) {
      const a = setError($('#rName'), validators.rName($('#rName').value));
      const b = setError($('#rPhone'), validators.rPhone($('#rPhone').value));
      return a && b;
    }
    if (n === 1) {
      const slot = $('[data-error-for="attending"]');
      const ok = Boolean(attending());
      if (slot) {
        slot.textContent = ok ? '' : 'Let us know if you can make it.';
        slot.classList.toggle('is-shown', !ok);
      }
      return ok;
    }
    return true;
  };

  const sizeViewport = () => {
    if (!viewport || !panels[step]) return;
    viewport.style.height = `${panels[step].offsetHeight}px`;
  };

  const goTo = (n) => {
    step = clamp(n, 0, panels.length - 1);
    track.style.transform = `translate3d(-${step * 100}%, 0, 0)`;

    panels.forEach((p, i) => {
      p.classList.toggle('is-current', i === step);
      $$('input, textarea, button', p).forEach(el => { el.tabIndex = i === step ? 0 : -1; });
    });
    stepsUI.forEach((li, i) => {
      li.classList.toggle('is-active', i === step);
      li.classList.toggle('is-done', i < step);
    });

    if (wizBar) wizBar.style.width = `${((step + 1) / panels.length) * 100}%`;
    btnPrev.hidden = step === 0;
    btnNext.hidden = step === panels.length - 1;
    btnSend.hidden = step !== panels.length - 1;

    if (step === panels.length - 1 && summary) {
      const name = $('#rName').value.trim() || 'You';
      summary.textContent = attending() === 'no'
        ? `${name} — regretfully declining. We will raise a glass to you anyway.`
        : `${name} — joyfully accepting, ${guests} ${guests === 1 ? 'seat' : 'seats'} at the table.`;
    }

    sizeViewport();
  };

  btnNext?.addEventListener('click', () => { if (validateStep(step)) goTo(step + 1); });
  btnPrev?.addEventListener('click', () => goTo(step - 1));

  $$('input[name="attending"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const declining = attending() === 'no';
      stepper?.classList.toggle('is-off', declining);
      $('[data-error-for="attending"]')?.classList.remove('is-shown');
      sizeViewport();
    });
  });

  $$('[data-step-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      guests = clamp(guests + Number(btn.dataset.stepDir), 1, 8);
      guestVal.textContent = guests;
      guestInp.value = guests;
      guestVal.classList.remove('is-tick');
      void guestVal.offsetWidth;
      guestVal.classList.add('is-tick');
    });
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep(0)) { goTo(0); return; }
    if (!validateStep(1)) { goTo(1); return; }

    form.classList.add('is-sending');
    $('.btn__text', btnSend).innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending…';

    // No backend here — point this at your form service or endpoint.
    setTimeout(() => {
      const first = $('#rName').value.trim().split(' ')[0];
      const coming = attending() === 'yes';

      $('.wizard__head', form).hidden = true;
      viewport.hidden = true;
      $('.wizard__nav', form).hidden = true;
      wizDone.hidden = false;
      $('#wizDoneText').textContent = coming
        ? `Thank you, ${first} — ${guests === 1 ? 'your seat is' : `${guests} seats are`} saved. See you on the twelfth.`
        : `Thank you, ${first} — we will miss you, and we understand completely.`;

      form.classList.remove('is-sending');
      status.textContent = '';
      status.classList.remove('is-shown');

      if (coming) {
        const r = wizDone.getBoundingClientRect();
        FX.burst(r.left + r.width / 2, r.top + 60, { count: 80, power: 13, gravity: 0.13 });
        FX.shower({ count: 60 });
      }
    }, 1200);
  });

  $('#wizReset')?.addEventListener('click', () => {
    form.reset();
    guests = 1;
    guestVal.textContent = '1';
    guestInp.value = '1';
    stepper?.classList.remove('is-off');
    $('.wizard__head', form).hidden = false;
    viewport.hidden = false;
    $('.wizard__nav', form).hidden = false;
    wizDone.hidden = true;
    $('.btn__text', btnSend).innerHTML = '<i class="fa-regular fa-paper-plane"></i> Send reply';
    $$('.field', form).forEach(f => f.classList.remove('has-error'));
    goTo(0);
  });

  if (form) {
    goTo(0);
    addEventListener('resize', sizeViewport);
    if (document.fonts) document.fonts.ready.then(sizeViewport);
    new IntersectionObserver((entries) => {
      if (entries.some(en => en.isIntersecting)) sizeViewport();
    }, { threshold: 0.1 }).observe(form);
  }

  /* =================== 15. ADD TO CALENDAR =================== */
  const pad = (n) => String(n).padStart(2, '0');
  const toStamp = (d) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  $('#calBtn')?.addEventListener('click', (e) => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Eranda and Ramesha//Wedding//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@eranda-ramesha`,
      `DTSTAMP:${toStamp(new Date())}`,
      `DTSTART:${toStamp(WEDDING.start)}`,
      `DTEND:${toStamp(WEDDING.end)}`,
      `SUMMARY:${WEDDING.title}`,
      `LOCATION:${WEDDING.location}`,
      `DESCRIPTION:${WEDDING.details}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eranda-and-ramesha.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    FX.burst(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, {
      count: 26, power: 8, gravity: 0.12, shapes: ['spark', 'petal']
    });
  });

  /* ===================== 16. MUSIC =========================== */
  /* Point MUSIC_FILE at your own track (e.g. 'music/ambience.mp3') and it
     plays that on loop. Left empty, the page performs its own score with
     the Web Audio API — a warm pad, a rolling arpeggio, a bass line and an
     occasional melody, all through a generated reverb. */
  const MUSIC_FILE = '';

  const playerEl  = $('#player');
  const musicBtn  = $('#musicToggle');
  const musicIcon = $('#musicIcon');
  const volume    = $('#volume');

  const BEAT = 0.9;                       // seconds per arpeggio note
  const level = () => (Number(volume?.value ?? 55) / 100) * 0.34;

  let audioCtx = null, master = null, dryBus = null, verbSend = null;
  let lookahead = null, beat = 0, nextTime = 0, playing = false, audioTrack = null;

  // I – V – vi – IV in D major: pad voicing, bass root, arpeggio notes.
  const PROGRESSION = [
    { pad: [146.83, 220.00, 293.66], bass:  73.42, arp: [293.66, 440.00, 554.37, 659.25] },
    { pad: [110.00, 164.81, 220.00], bass:  55.00, arp: [329.63, 440.00, 554.37, 659.25] },
    { pad: [123.47, 185.00, 246.94], bass:  61.74, arp: [246.94, 369.99, 493.88, 587.33] },
    { pad: [ 98.00, 146.83, 196.00], bass:  49.00, arp: [293.66, 392.00, 493.88, 587.33] }
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
  const MELODY = [659.25, 587.33, 493.88, 554.37, 659.25, 739.99, 587.33, 493.88];

  /** A decaying noise burst makes a perfectly serviceable concert-hall tail. */
  const impulse = (ctx, seconds, decay) => {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  };

  const buildGraph = () => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    master = audioCtx.createGain();
    master.gain.value = 0;                       // faded up when play starts

    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;

    const verb = audioCtx.createConvolver();
    verb.buffer = impulse(audioCtx, 3.6, 2.6);

    dryBus = audioCtx.createGain();
    dryBus.gain.value = 0.7;
    verbSend = audioCtx.createGain();
    verbSend.gain.value = 0.55;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.5;

    dryBus.connect(master);
    verbSend.connect(verb);
    verb.connect(wet);
    wet.connect(master);
    master.connect(comp);
    comp.connect(audioCtx.destination);
  };

  const voice = (opts) => {
    const { freq, at, dur, gain: peak, type = 'triangle', cutoff = 2600, detune = 0 } = opts;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    const tone = audioCtx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    tone.type = 'lowpass';
    tone.frequency.value = cutoff;

    const attack = Math.min(dur * 0.3, opts.attack ?? 0.02);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(peak, at + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(tone);
    tone.connect(amp);
    amp.connect(dryBus);
    amp.connect(verbSend);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  };

  const scheduleBeat = (n, at) => {
    const chord = PROGRESSION[Math.floor(n / 8) % PROGRESSION.length];

    // rolling arpeggio — the melody you actually hear
    voice({ freq: chord.arp[ARP[n % 8]], at, dur: 2.9, gain: 0.11, cutoff: 3200 });
    voice({ freq: chord.arp[ARP[n % 8]] * 2, at: at + 0.01, dur: 1.4, gain: 0.028, type: 'sine' });

    // pad + bass land on each chord change
    if (n % 8 === 0) {
      chord.pad.forEach((f, i) => {
        voice({ freq: f, at, dur: 7.6, gain: 0.05, type: 'sawtooth', cutoff: 900, attack: 1.6, detune: i * 4 - 4 });
        voice({ freq: f, at, dur: 7.6, gain: 0.04, type: 'sawtooth', cutoff: 900, attack: 1.9, detune: 4 - i * 4 });
      });
      voice({ freq: chord.bass, at, dur: 6.5, gain: 0.13, type: 'sine', attack: 0.12 });
    }

    // a slow line drifting over the top
    if (n % 16 === 6 || n % 16 === 13) {
      voice({ freq: MELODY[Math.floor(n / 8) % MELODY.length], at: at + 0.18, dur: 3.4, gain: 0.075, cutoff: 2200, attack: 0.18 });
    }
  };

  /** Look-ahead scheduling keeps the timing steady even when the tab stutters. */
  const runScheduler = () => {
    while (nextTime < audioCtx.currentTime + 0.7) {
      scheduleBeat(beat, nextTime);
      nextTime += BEAT;
      beat++;
    }
  };

  const setPlayingUI = (on) => {
    playing = on;
    musicIcon.className = on ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    musicBtn.setAttribute('aria-label', on ? 'Pause background music' : 'Play background music');
    musicBtn.setAttribute('aria-pressed', String(on));
    playerEl.classList.toggle('is-playing', on);
  };

  async function startMusic() {
    if (playing) return;

    if (MUSIC_FILE) {
      if (!audioTrack) {
        audioTrack = new Audio(MUSIC_FILE);
        audioTrack.loop = true;
        audioTrack.addEventListener('error', () => { audioTrack = null; }, { once: true });
      }
      audioTrack.volume = level() * 2.5;
      try { await audioTrack.play(); setPlayingUI(true); return; }
      catch (e) { /* blocked or missing — fall through to the generated score */ }
    }

    if (!audioCtx) buildGraph();
    try { if (audioCtx.state === 'suspended') await audioCtx.resume(); }
    catch (e) { return; }
    if (audioCtx.state !== 'running') return;

    master.gain.cancelScheduledValues(audioCtx.currentTime);
    master.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    master.gain.exponentialRampToValueAtTime(Math.max(level(), 0.001), audioCtx.currentTime + 2.4);

    nextTime = audioCtx.currentTime + 0.15;
    runScheduler();
    lookahead = setInterval(runScheduler, 200);
    setPlayingUI(true);
  }

  const stopMusic = () => {
    if (!playing) return;
    if (audioTrack && !audioTrack.paused) audioTrack.pause();
    if (audioCtx && master) {
      master.gain.cancelScheduledValues(audioCtx.currentTime);
      master.gain.setValueAtTime(master.gain.value, audioCtx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.9);
    }
    clearInterval(lookahead);
    lookahead = null;
    setPlayingUI(false);
  };

  musicBtn?.addEventListener('click', () => (playing ? stopMusic() : startMusic()));

  volume?.addEventListener('input', () => {
    volume.style.setProperty('--fill', `${volume.value}%`);
    if (audioTrack) audioTrack.volume = Math.min(level() * 2.5, 1);
    if (master && playing) master.gain.setTargetAtTime(Math.max(level(), 0.001), audioCtx.currentTime, 0.1);
  });
  volume?.style.setProperty('--fill', `${volume.value}%`);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) stopMusic();
  });

  /* ========================= BOOT ============================ */
  runPreloader().then(() => {
    stopDust = startDust();
    // Hero spark motes
    const host = $('#heroSparks');
    if (host && !reduced) {
      for (let i = 0; i < 26; i++) {
        const s = document.createElement('span');
        s.className = 'spark';
        s.style.left = `${rand(2, 98).toFixed(1)}%`;
        s.style.top = `${rand(5, 95).toFixed(1)}%`;
        s.style.setProperty('--dur', `${rand(3.5, 8).toFixed(1)}s`);
        s.style.setProperty('--delay', `-${rand(0, 8).toFixed(1)}s`);
        host.appendChild(s);
      }
    }
    requestScroll();
  });

})();
