/* ==========================================================================
   LE SHAMAN — Homepage interactions
   GSAP 3 + ScrollTrigger + Lenis (fichiers locaux dans assets/js)
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');

  if (!hasGsap || reduceMotion) root.classList.remove('js');

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (hasGsap && !reduceMotion && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  const scrollToTarget = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const offset = el.id === 'top' ? 0 : -($('#header')?.offsetHeight || 0) + (el.classList.contains('section') || el.classList.contains('events') ? 0 : -24);
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  /* ---------- Liens provisoires (data-todo) ---------- */
  let toastTimer;
  const toast = (msg) => {
    let t = $('.todo-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'todo-toast label';
      t.setAttribute('role', 'status');
      Object.assign(t.style, { position: 'fixed', left: '50%', bottom: '24px', transform: 'translate(-50%, 20px)', zIndex: 120, background: '#2e2e2e', color: '#f6eee1', padding: '14px 22px', borderRadius: '999px', opacity: 0, transition: 'opacity .4s, transform .5s cubic-bezier(.16,1,.3,1)', pointerEvents: 'none', maxWidth: '90vw', textAlign: 'center' });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => { t.style.opacity = 1; t.style.transform = 'translate(-50%, 0)'; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = 0; t.style.transform = 'translate(-50%, 20px)'; }, 2400);
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (a.dataset.dragged === '1') { e.preventDefault(); return; }
    const href = a.getAttribute('href') || '';
    if (a.hasAttribute('data-todo') && href === '#') {
      e.preventDefault();
      toast('Page en préparation');
      return;
    }
    if (href.length > 1 && href.startsWith('#')) {
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      closeAll();
      scrollToTarget(target);
      history.replaceState(null, '', href);
    }
  });

  /* ---------- Header ---------- */
  const header = $('#header');
  const hero = $('.hero');
  const updateHeader = () => {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > Math.min(120, (hero?.offsetHeight || 600) * 0.15));
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* ---------- Overlays : menu & réservation ---------- */
  const overlays = {
    menu: { el: $('#menu'), openers: $$('[data-menu-open]'), closers: $$('[data-menu-close]') },
    booking: { el: $('#booking'), openers: $$('[data-booking-open]'), closers: $$('[data-booking-close]') },
  };
  let lastFocus = null;
  let openName = null;

  const focusables = (el) => $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', el).filter((n) => n.offsetParent !== null || n === document.activeElement);

  function open(name) {
    const o = overlays[name];
    if (!o.el) return;
    if (openName && openName !== name) close(openName, false);
    lastFocus = document.activeElement;
    openName = name;
    o.el.classList.add('is-open');
    o.el.setAttribute('aria-hidden', 'false');
    o.openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    if (hasGsap && !reduceMotion && name === 'menu') {
      gsap.fromTo($$('.menu__nav > ul > li, .menu__foot', o.el), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .055, delay: .25 });
    }
    setTimeout(() => { const f = focusables(o.el); (f.find((n) => n.matches('[data-menu-close], [data-booking-close]')) || f[0])?.focus(); }, 60);
  }
  function close(name, restore = true) {
    const o = overlays[name];
    if (!o.el || !o.el.classList.contains('is-open')) return;
    o.el.classList.remove('is-open');
    o.el.setAttribute('aria-hidden', 'true');
    o.openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (lenis) lenis.start(); else document.body.style.overflow = '';
    openName = null;
    if (restore && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  function closeAll() { Object.keys(overlays).forEach((n) => close(n, false)); }

  Object.entries(overlays).forEach(([name, o]) => {
    o.openers.forEach((b) => b.addEventListener('click', () => open(name)));
    o.closers.forEach((b) => b.addEventListener('click', () => close(name)));
  });
  document.addEventListener('keydown', (e) => {
    if (!openName) return;
    if (e.key === 'Escape') { close(openName); return; }
    if (e.key === 'Tab') {
      const f = focusables(overlays[openName].el);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Visuel du menu qui suit le survol
  const menuImgs = $$('.menu__visual img');
  const showVisual = (i) => {
    const img = menuImgs[i];
    if (!img) return;
    if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
    menuImgs.forEach((m) => m.classList.toggle('is-active', m === img));
  };
  $$('#menu [data-visual]').forEach((a) => {
    a.addEventListener('mouseenter', () => showVisual(+a.dataset.visual));
    a.addEventListener('focus', () => showVisual(+a.dataset.visual));
  });

  /* ---------- Hero : diaporama ---------- */
  const slides = $$('.hero__slide');
  const dots = $$('[data-hero-dot]');
  const placeEl = $('[data-hero-place]');
  const indexEl = $('[data-hero-index]');
  const progress = $('.hero__progress');
  let heroIndex = 0;
  let heroTimer = null;
  const HERO_DELAY = 7000;

  const loadSlide = (s) => {
    const img = $('img', s);
    if (img && img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); }
  };
  const goHero = (i) => {
    if (!slides.length) return;
    heroIndex = (i + slides.length) % slides.length;
    loadSlide(slides[heroIndex]);
    loadSlide(slides[(heroIndex + 1) % slides.length]);
    slides.forEach((s, k) => s.classList.toggle('is-active', k === heroIndex));
    dots.forEach((d, k) => d.setAttribute('aria-current', k === heroIndex ? 'true' : 'false'));
    if (indexEl) indexEl.textContent = pad(heroIndex + 1);
    if (placeEl) {
      placeEl.style.opacity = 0;
      setTimeout(() => { placeEl.textContent = slides[heroIndex].dataset.place || ''; placeEl.style.opacity = 1; }, 350);
    }
    if (progress) { progress.classList.remove('is-running'); void progress.offsetWidth; progress.classList.add('is-running'); }
    restartHero();
  };
  const restartHero = () => {
    clearTimeout(heroTimer);
    if (reduceMotion) return;
    heroTimer = setTimeout(() => goHero(heroIndex + 1), HERO_DELAY);
  };
  dots.forEach((d) => d.addEventListener('click', () => goHero(+d.dataset.heroDot)));
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(heroTimer); else restartHero(); });
  window.addEventListener('load', () => loadSlide(slides[1] || slides[0]));
  restartHero();

  /* ---------- Sliders (L'Attilio & Expérience) ---------- */
  class Slider {
    constructor(el, opts = {}) {
      this.el = el;
      this.track = $('[data-track]', el);
      this.items = Array.from(this.track.children);
      this.section = el.closest('section, .tables') || el;
      this.prevBtns = $$('[data-prev]', this.section);
      this.nextBtns = $$('[data-next]', this.section);
      this.countEl = $('[data-count]', this.section);
      this.barEl = $('[data-bar]', this.section);
      this.textEl = opts.textEl ? $(opts.textEl, this.section) : null;
      this.index = 0;
      this.offset = 0;
      this.bind();
      this.go(0, true);
      window.addEventListener('resize', () => this.go(this.index, true));
    }
    targetOffset(i) {
      // Mesure la position finale de l'élément i sans transitions, puis restaure l'état courant.
      const t = this.track;
      const current = this.items.map((n) => n.classList.contains('is-active'));
      t.classList.add('is-measuring');
      this.items.forEach((n) => { n.style.transition = 'none'; });
      this.items.forEach((n, k) => n.classList.toggle('is-active', k === i));
      const prevTransform = t.style.transform;
      t.style.transform = 'none';
      const left = this.items[i].offsetLeft;
      const max = Math.max(0, t.scrollWidth - t.parentElement.clientWidth);
      this.items.forEach((n, k) => n.classList.toggle('is-active', current[k]));
      t.style.transform = prevTransform;
      void t.offsetWidth;
      this.items.forEach((n) => { n.style.transition = ''; });
      t.classList.remove('is-measuring');
      return window.innerWidth <= 960 ? Math.min(left, max) : left;
    }
    go(i, instant = false) {
      i = Math.max(0, Math.min(this.items.length - 1, i));
      const offset = this.targetOffset(i);
      this.index = i;
      this.offset = offset;
      if (instant) this.track.style.transition = 'none';
      this.items.forEach((n, k) => {
        n.classList.toggle('is-active', k === i);
        n.setAttribute('aria-hidden', 'false');
        $$('a, button:not(.slide__peek):not(.xp__peek)', n).forEach((f) => f.setAttribute('tabindex', k === i || window.innerWidth <= 960 ? '0' : '-1'));
      });
      this.track.style.transform = `translate3d(${-offset}px,0,0)`;
      if (instant) { void this.track.offsetWidth; this.track.style.transition = ''; }
      this.prevBtns.forEach((b) => (b.disabled = i === 0));
      this.nextBtns.forEach((b) => (b.disabled = i === this.items.length - 1));
      if (this.countEl) this.countEl.textContent = pad(i + 1);
      if (this.barEl) this.barEl.style.width = `${((i + 1) / this.items.length) * 100}%`;
      if (this.textEl) {
        const txt = this.items[i].dataset.text || '';
        if (instant) this.textEl.innerHTML = txt;
        else {
          this.textEl.style.opacity = 0;
          setTimeout(() => { this.textEl.innerHTML = txt; this.textEl.style.opacity = 1; }, 300);
        }
      }
    }
    bind() {
      this.prevBtns.forEach((b) => b.addEventListener('click', () => this.go(this.index - 1)));
      this.nextBtns.forEach((b) => b.addEventListener('click', () => this.go(this.index + 1)));
      this.items.forEach((n, k) => {
        const peek = $('.slide__peek, .xp__peek', n);
        if (peek) peek.addEventListener('click', () => this.go(k));
      });
      this.el.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.go(this.index + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.index - 1); }
      });
      // Glisser (souris + tactile)
      let startX = 0, startY = 0, dx = 0, dragging = false, decided = false, horizontal = false;
      const onDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        dragging = true; decided = false; horizontal = false; dx = 0;
        startX = e.clientX; startY = e.clientY;
      };
      const onMove = (e) => {
        if (!dragging) return;
        const mx = e.clientX - startX, my = e.clientY - startY;
        if (!decided && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
          decided = true; horizontal = Math.abs(mx) > Math.abs(my);
          if (horizontal) { this.track.classList.add('is-dragging'); try { this.track.setPointerCapture(e.pointerId); } catch (_) {} }
        }
        if (!horizontal) return;
        dx = mx;
        const resist = (this.index === 0 && dx > 0) || (this.index === this.items.length - 1 && dx < 0) ? 0.35 : 1;
        this.track.style.transform = `translate3d(${-this.offset + dx * resist}px,0,0)`;
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        this.track.classList.remove('is-dragging');
        if (horizontal && Math.abs(dx) > 8) {
          $$('a', this.track).forEach((a) => { a.dataset.dragged = '1'; setTimeout(() => delete a.dataset.dragged, 60); });
        }
        if (horizontal && dx < -60) this.go(this.index + 1);
        else if (horizontal && dx > 60) this.go(this.index - 1);
        else this.go(this.index);
      };
      this.track.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      this.track.addEventListener('dragstart', (e) => e.preventDefault());
    }
  }
  const tablesEl = $('[data-slider="tables"]');
  const xpEl = $('[data-slider="experience"]');
  if (tablesEl) new Slider(tablesEl);
  if (xpEl) new Slider(xpEl, { textEl: '[data-xp-text]' });

  /* ---------- Animations GSAP ---------- */
  if (!hasGsap || reduceMotion) return;

  // Ouverture
  const letters = (() => {
    const wm = $('.hero__watermark[data-split]');
    if (!wm) return [];
    const txt = wm.textContent.trim();
    wm.textContent = '';
    return Array.from(txt).map((ch) => { const s = document.createElement('span'); s.textContent = ch; wm.appendChild(s); return s; });
  })();
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .to(letters, { opacity: 1, y: 0, duration: 1.6, stagger: { each: .07, from: 'center' } }, .3)
    .fromTo('.hero__name', { opacity: 0, letterSpacing: '1.3em' }, { opacity: 1, letterSpacing: window.innerWidth > 960 ? '.82em' : '.5em', duration: 2, ease: 'power2.out' }, .7)
    .fromTo('.hero__tag', { opacity: 0, y: 14 }, { opacity: .92, y: 0, duration: 1.2 }, 1.3)
    .fromTo('.site-header', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1.2 }, 1.1)
    .fromTo('.hero__foot', { opacity: 0 }, { opacity: 1, duration: 1.2 }, 1.5);

  // Hero : parallaxe au défilement
  gsap.to('[data-hero-media]', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '80% top', scrub: true } });

  // Fils verticaux
  $$('[data-thread]').forEach((el) => {
    gsap.to(el, { scaleY: 1, duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  // Titres de section : l'interlettrage se resserre
  $$('[data-title]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => el.classList.add('is-in') });
  });

  // Textes : apparition en cascade, groupés par conteneur
  const fadeGroups = new Map();
  $$('[data-fade]').forEach((el) => {
    const key = el.parentElement;
    if (!fadeGroups.has(key)) fadeGroups.set(key, []);
    fadeGroups.get(key).push(el);
  });
  fadeGroups.forEach((els, parent) => {
    gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: parent, start: 'top 82%' } });
  });

  // Images : révélation par rideau + désagrandissement
  $$('[data-reveal]').forEach((el) => {
    const img = $('img', el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%' } });
    tl.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'power4.inOut' })
      .to(img, { scale: 1, duration: 2.2, ease: 'power3.out', clearProps: img.hasAttribute('data-parallax') ? '' : 'transform' }, 0);
  });

  // Parallaxe interne des images
  $$('[data-parallax]').forEach((img) => {
    const amt = parseFloat(img.dataset.parallaxAmount || 6);
    const trigger = img.closest('.reveal-img, .spa__band, .events, .feature') || img;
    gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Blocs décalés : légère profondeur sur les vignettes superposées
  $$('.split__inset, .commit__inset, .feature__inset').forEach((el) => {
    gsap.fromTo(el, { y: 60 }, { y: -30, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.experience__deco', { rotate: -12 }, { rotate: 18, ease: 'none', scrollTrigger: { trigger: '.experience', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.site-footer__deco', { rotate: 0 }, { rotate: 40, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  // Sliders : entrée en scène
  $$('.slider__track').forEach((t) => {
    gsap.from(t.children, { opacity: 0, x: 80, duration: 1.4, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: t, start: 'top 85%' } });
  });

  // Recalcul après chargement des polices / images
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
