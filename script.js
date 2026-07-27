/* =============================================================
   ERANDA & Ramesha — Wedding Invitation
   -------------------------------------------------------------
   1.  Helpers & settings
   2.  Opening: dust canvas + envelope sequence
   3.  Text splitting
   4.  Reveal on scroll (IntersectionObserver)
   5.  Scroll engine: progress bar, parallax, timeline, quotes
   6.  Pointer: cursor glow, mouse parallax, magnetic, 3D tilt
   7.  Click ripple
   8.  Floating flora & hero sparks
   9.  Countdown
   10. Gallery lightbox
   11. RSVP form
   12. Music player (generated ambience — no audio file needed)
   ============================================================= */

(() => {
  'use strict';

  /* ==================== 1. HELPERS & SETTINGS ================ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /** The big day. Change this one line to move the whole site's date logic. */
  const WEDDING_DATE = new Date('2026-12-12T16:30:00');

  const body = document.body;

  /* ============= 2. OPENING: DUST + ENVELOPE ================= */
  const opening = $('#opening');
  const envelope = $('#envelope');
  const canvas = $('#dustCanvas');

  /** Slow drifting dust motes behind the envelope. */
  const startDust = () => {
    if (!canvas || reduced) return () => {};
    const ctx = canvas.getContext('2d');
    let motes = [], raf = null, w = 0, h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      h = canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      const count = Math.round(clamp(innerWidth / 14, 45, 110));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.5, 2.1) * dpr,
        vx: rand(-0.16, 0.16) * dpr,
        vy: rand(-0.34, -0.06) * dpr,
        a: rand(0.15, 0.75),
        tw: rand(0.004, 0.016)
      }));
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy;
        m.a += m.tw;
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

  const stopDust = startDust();

  /** The cinematic open: flap folds, letter rises, stage zooms, site fades in. */
  let opened = false;
  const openInvitation = () => {
    if (opened) return;
    opened = true;

    envelope.classList.add('is-opening');
    envelope.setAttribute('aria-expanded', 'true');

    // Give the flap + letter time to finish before the camera pushes in.
    setTimeout(() => opening.classList.add('is-open'), reduced ? 100 : 1500);

    setTimeout(() => {
      body.classList.remove('is-locked');
      body.classList.add('is-revealed');
      $('#site').setAttribute('aria-hidden', 'false');
      // The two names are "written" once the hero is on screen.
      $$('.hero [data-hand]').forEach(el => el.classList.add('is-written'));
      opening.setAttribute('hidden', '');
      stopDust();
      // The music button drifts in once the invitation has settled.
      setTimeout(() => $('#player').classList.add('is-shown'), 900);
    }, reduced ? 400 : 2900);
  };

  envelope?.addEventListener('click', openInvitation);

  /* ==================== 3. TEXT SPLITTING ==================== */
  // Per-character rise for the opening title.
  $$('[data-split]').forEach(el => {
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      el.appendChild(span);
    });
  });

  // Per-word slide-up for section titles, revealed together with the section.
  $$('.section__title').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ============ 4. REVEAL ON SCROLL (OBSERVER) =============== */
  const revealables = $$('[data-reveal]');

  // Stagger siblings inside the same grid so cards cascade rather than pop.
  $$('.cards .card, .masonry .shot').forEach((el, i) => {
    el.style.setProperty('--delay', `${(i % 6) * 0.09}s`);
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  revealables.forEach(el => revealObserver.observe(el));

  // Names outside the hero write themselves as they come into view.
  const handObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-written');
      handObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  $$('[data-hand]').forEach(el => {
    if (!el.closest('.hero')) handObserver.observe(el);
  });

  /* ======= 5. SCROLL ENGINE (one rAF loop for everything) ==== */
  const progressBar = $('#progressBar');
  const parallaxEls = $$('[data-parallax]');
  const timeline    = $('#timeline');
  const timelineFill = $('#timelineFill');
  const quotes      = $$('[data-quote]');

  let ticking = false;

  const onScrollFrame = () => {
    const vh = innerHeight;
    const y = scrollY;

    // Scroll progress
    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.width = `${clamp((y / (max || 1)) * 100, 0, 100)}%`;

    // Parallax layers
    if (!reduced) {
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${(-offset).toFixed(2)}px, 0)`;
      });
    }

    // Golden timeline line fills as you read down the story
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const progress = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      timelineFill.style.height = `${(progress * 100).toFixed(2)}%`;
    }

    // Quotes brighten as they cross the middle of the screen
    quotes.forEach(q => {
      const r = q.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const dist = Math.abs(center - vh / 2) / (vh / 2);
      q.classList.toggle('is-lit', dist < 0.55);
    });

    ticking = false;
  };

  const requestScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScrollFrame);
  };

  addEventListener('scroll', requestScroll, { passive: true });
  addEventListener('resize', requestScroll);
  requestScroll();

  /* ====== 6. POINTER: GLOW · PARALLAX · MAGNETIC · TILT ====== */
  const glow = $('#cursorGlow');

  if (finePointer && !reduced) {
    let gx = 0, gy = 0, tx = 0, ty = 0;

    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('is-on');

      // Gentle mouse parallax on the hero block
      const heroInner = $('.hero__inner');
      if (heroInner && scrollY < innerHeight) {
        const dx = (e.clientX / innerWidth - 0.5) * 16;
        const dy = (e.clientY / innerHeight - 0.5) * 12;
        heroInner.style.setProperty('--mx', `${dx}px`);
        heroInner.style.marginLeft = `${dx * 0.25}px`;
        heroInner.style.marginTop = `${dy * 0.25}px`;
      }
    });

    const glowLoop = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(glowLoop);
    };
    glowLoop();

    // Magnetic buttons
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * 0.28}px, ${my * 0.34}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // Subtle 3D tilt on cards and portraits
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-6px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ==================== 7. CLICK RIPPLE ====================== */
  addEventListener('pointerdown', (e) => {
    if (reduced) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = `${e.clientX}px`;
    r.style.top = `${e.clientY}px`;
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 800);
  });

  /* ============= 8. FLOATING FLORA & HERO SPARKS ============= */
  const flora = $('#flora');

  const buildFlora = () => {
    if (!flora || reduced) return;
    const petals = ['fa-solid fa-fan', 'fa-solid fa-seedling', 'fa-regular fa-star', 'fa-solid fa-leaf'];
    const count = innerWidth < 720 ? 12 : 22;

    for (let i = 0; i < count; i++) {
      const kind = Math.random();
      let el;

      if (kind < 0.62) {
        // Petals & leaves
        el = document.createElement('i');
        el.className = `petal ${petals[Math.floor(Math.random() * petals.length)]}`;
        if (Math.random() < 0.35) el.classList.add('petal--blush');
        else if (Math.random() < 0.4) el.classList.add('petal--leaf');
        el.style.fontSize = `${rand(8, 17).toFixed(1)}px`;
        el.style.setProperty('--dur', `${rand(22, 46).toFixed(1)}s`);
        el.style.setProperty('--drift', `${rand(-14, 14).toFixed(1)}vw`);
        el.style.setProperty('--op', rand(0.25, 0.7).toFixed(2));
      } else if (kind < 0.9) {
        // Sparkles
        el = document.createElement('span');
        el.className = 'spark';
        el.style.top = `${rand(5, 95)}%`;
        el.style.setProperty('--dur', `${rand(4, 9).toFixed(1)}s`);
      } else {
        // Tiny butterflies
        el = document.createElement('span');
        el.className = 'butterfly';
        el.innerHTML = '<i class="fa-solid fa-fan"></i>';
        el.style.top = `${rand(55, 95)}%`;
        el.style.setProperty('--dur', `${rand(26, 44).toFixed(1)}s`);
        el.style.setProperty('--drift', `${rand(-26, 26).toFixed(1)}vw`);
      }

      el.style.left = `${rand(0, 100).toFixed(1)}%`;
      el.style.setProperty('--delay', `-${rand(0, 26).toFixed(1)}s`);
      flora.appendChild(el);
    }
  };
  buildFlora();

  /** Golden particles that hover around the hero names. */
  const buildSparks = () => {
    const host = $('#heroSparks');
    if (!host || reduced) return;
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = `${rand(2, 98)}%`;
      s.style.top = `${rand(5, 95)}%`;
      s.style.setProperty('--dur', `${rand(3.5, 8).toFixed(1)}s`);
      s.style.setProperty('--delay', `-${rand(0, 8).toFixed(1)}s`);
      host.appendChild(s);
    }
  };
  buildSparks();

  /* ====================== 9. COUNTDOWN ======================= */
  const cd = {
    days:  $('#cdDays'),
    hours: $('#cdHours'),
    mins:  $('#cdMins'),
    secs:  $('#cdSecs')
  };

  const setUnit = (node, value) => {
    const text = String(value).padStart(2, '0');
    if (!node || node.textContent === text) return;
    node.textContent = text;
    node.classList.remove('is-tick');
    void node.offsetWidth;         // restart the flip animation
    node.classList.add('is-tick');
  };

  const tick = () => {
    const diff = WEDDING_DATE - Date.now();
    if (diff <= 0) {
      setUnit(cd.days, 0); setUnit(cd.hours, 0); setUnit(cd.mins, 0); setUnit(cd.secs, 0);
      const note = $('.clock__note');
      if (note) note.textContent = 'Today is the day.';
      return;
    }
    const s = Math.floor(diff / 1000);
    setUnit(cd.days,  Math.floor(s / 86400));
    setUnit(cd.hours, Math.floor(s / 3600) % 24);
    setUnit(cd.mins,  Math.floor(s / 60) % 60);
    setUnit(cd.secs,  s % 60);
  };
  tick();
  setInterval(tick, 1000);

  /* ==================== 10. GALLERY LIGHTBOX ================= */
  const shots = $$('.shot');
  const lightbox = $('#lightbox');
  const lbCaption = $('#lbCaption');
  let lbIndex = 0;

  const showShot = (i) => {
    lbIndex = (i + shots.length) % shots.length;
    lbCaption.textContent = shots[lbIndex].dataset.shot || '';
    // When real images are added, mirror the <img> into #lbFrame here.
  };

  const openLightbox = (i) => {
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    body.style.overflow = 'hidden';
    showShot(i);
    $('#lbClose').focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    body.style.overflow = '';
    setTimeout(() => { lightbox.hidden = true; }, 450);
  };

  shots.forEach((shot, i) => {
    shot.setAttribute('tabindex', '0');
    shot.setAttribute('role', 'button');
    shot.addEventListener('click', () => openLightbox(i));
    shot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => showShot(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => showShot(lbIndex + 1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showShot(lbIndex + 1);
    if (e.key === 'ArrowLeft') showShot(lbIndex - 1);
  });

  /* ====================== 11. RSVP FORM ====================== */
  const form = $('#rsvpForm');
  const status = $('#formStatus');

  const setError = (input, message) => {
    const field = input.closest('.field');
    const slot = field.querySelector('.field__error');
    field.classList.toggle('has-error', Boolean(message));
    if (slot) slot.textContent = message || '';
    return !message;
  };

  const validators = {
    rName: (v) => v.trim().length >= 2 ? '' : 'Please enter your full name.',
    rAttend: (v) => v ? '' : 'Let us know if you can make it.',
    rGuests: (v) => {
      const n = Number(v);
      if (!v) return 'How many seats should we save?';
      if (!Number.isInteger(n) || n < 1 || n > 6) return 'Enter a number between 1 and 6.';
      return '';
    },
    rPhone: (v) => /^[+\d][\d\s()-]{6,}$/.test(v.trim()) ? '' : 'Enter a phone number we can reach you on.'
  };

  Object.keys(validators).forEach(id => {
    const input = $(`#${id}`);
    input.addEventListener('blur', () => setError(input, validators[id](input.value)));
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('has-error')) {
        setError(input, validators[id](input.value));
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;
    Object.keys(validators).forEach(id => {
      const input = $(`#${id}`);
      if (!setError(input, validators[id](input.value))) valid = false;
    });

    if (!valid) {
      status.textContent = 'A few details are missing.';
      status.classList.add('is-shown');
      form.querySelector('.has-error input, .has-error select')?.focus();
      return;
    }

    // No backend here — wire this up to your form service or endpoint.
    form.classList.add('is-sending');
    $('.btn__text', form).textContent = 'Sending…';

    setTimeout(() => {
      form.classList.remove('is-sending');
      const name = $('#rName').value.trim().split(' ')[0];
      const coming = $('#rAttend').value === 'yes';
      status.textContent = coming
        ? `Thank you, ${name} — your seat is saved. See you on the 12th.`
        : `Thank you, ${name} — we will miss you, and we understand.`;
      status.classList.add('is-shown');
      form.reset();
      $('.btn__text', form).textContent = 'Send reply';
    }, 1100);
  });

  /* ============== 12. MUSIC PLAYER (generated) =============== */
  /* A soft piano-like arpeggio built with the Web Audio API, so the page
     works straight from index.html with no audio file to ship.
     To use a real track instead: create an <audio> element and swap the
     play/pause calls inside toggleMusic(). */
  const playerEl = $('#player');
  const musicBtn = $('#musicToggle');
  const musicIcon = $('#musicIcon');
  const volume = $('#volume');

  let audioCtx = null, master = null, timer = null, step = 0;
  let playing = false;

  // I – V – vi – IV in D major, voiced high and sparse.
  const chords = [
    [293.66, 440.00, 554.37, 880.00],  // D
    [220.00, 329.63, 440.00, 659.25],  // A
    [246.94, 369.99, 493.88, 739.99],  // Bm
    [196.00, 293.66, 392.00, 587.33]   // G
  ];

  const buildAudio = () => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    master = audioCtx.createGain();
    master.gain.value = (volume.value / 100) * 0.35;

    // A little space: gentle low-pass plus a feedback delay.
    const tone = audioCtx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;

    const delay = audioCtx.createDelay(1.5);
    delay.delayTime.value = 0.42;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.34;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.3;

    tone.connect(master);
    tone.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
    master.connect(audioCtx.destination);

    return tone;
  };

  let voiceOut = null;

  const playNote = (freq, when, length = 2.4) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.16, when + 0.06);   // soft attack
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length); // long tail

    osc.connect(gain);
    gain.connect(voiceOut);
    osc.start(when);
    osc.stop(when + length + 0.1);
  };

  const scheduleStep = () => {
    const chord = chords[Math.floor(step / 4) % chords.length];
    const note = chord[step % 4];
    const now = audioCtx.currentTime;

    playNote(note, now + 0.02, 2.8);
    if (step % 8 === 0) playNote(chord[0] / 2, now + 0.02, 4.5); // bass swell
    step++;
  };

  const toggleMusic = async () => {
    if (!audioCtx) voiceOut = buildAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    playing = !playing;

    if (playing) {
      scheduleStep();
      timer = setInterval(scheduleStep, 1400);
      musicIcon.className = 'fa-solid fa-pause';
      musicBtn.setAttribute('aria-label', 'Pause background music');
    } else {
      clearInterval(timer);
      musicIcon.className = 'fa-solid fa-play';
      musicBtn.setAttribute('aria-label', 'Play background music');
    }

    musicBtn.setAttribute('aria-pressed', String(playing));
    playerEl.classList.toggle('is-playing', playing);
  };

  musicBtn.addEventListener('click', toggleMusic);

  volume.addEventListener('input', () => {
    volume.style.setProperty('--fill', `${volume.value}%`);
    if (master) master.gain.value = (volume.value / 100) * 0.35;
  });
  volume.style.setProperty('--fill', `${volume.value}%`);

  // Pause the ambience when the tab is hidden — nobody wants a ghost soundtrack.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) toggleMusic();
  });

})();