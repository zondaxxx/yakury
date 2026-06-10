/* ════════════════════════════════════════════════════════════════
   ZONDAXXX — orchestration
   preloader · smooth scroll · DOM choreography · micro-physics
   ════════════════════════════════════════════════════════════════ */

import { createScene } from './scene.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ── Smooth scroll ────────────────────────────────────────────── */
let lenis = null;
if (!reducedMotion && typeof Lenis === 'function') {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}

/* ── Anchor sailing ───────────────────────────────────────────── */
for (const link of document.querySelectorAll('[data-scroll]')) {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || !id.startsWith('#')) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(target, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });
}

/* ── 3D stage ─────────────────────────────────────────────────── */
let sceneAPI = null;
let scenePromise = Promise.resolve();
try {
  sceneAPI = createScene({ canvas: document.getElementById('gl'), reducedMotion });
  scenePromise = sceneAPI.ready();
} catch (err) {
  console.warn('ZONDAXXX: WebGL unavailable, falling back to still void.', err);
  document.body.classList.add('no-webgl');
}

/* ── Word splitter ────────────────────────────────────────────── */
function splitWords(el, { mask = true } = {}) {
  const nodes = [...el.childNodes];
  el.innerHTML = '';
  const innerSpans = [];
  const push = (content) => {
    const w = document.createElement('span');
    w.className = mask ? 'w' : 'w w--free';
    const wi = document.createElement('span');
    wi.className = 'wi';
    wi.append(content);
    w.append(wi);
    el.append(w);
    innerSpans.push(wi);
  };
  for (const n of nodes) {
    if (n.nodeType === Node.TEXT_NODE) {
      for (const part of n.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { el.append(' '); continue; }
        push(part);
      }
    } else {
      push(n);
    }
  }
  return innerSpans;
}

/* ── Initial hidden states ────────────────────────────────────── */
if (!reducedMotion) {
  gsap.set('.hero-eyebrow', { opacity: 0, y: 18 });
  gsap.set('.line-inner', { yPercent: 118 });
  gsap.set('.hero-sub', { opacity: 0, y: 26, filter: 'blur(8px)' });
  gsap.set('.hero-cta .btn', { opacity: 0, y: 24 });
  gsap.set('.scroll-hint', { opacity: 0 });
}

/* ════════════════════════════════════════════════════════════════
   Preloader → reveal
   ════════════════════════════════════════════════════════════════ */

const countEl = document.getElementById('count');
const barEl = document.getElementById('bar');
const counter = { v: 0 };

function renderCount() {
  countEl.textContent = String(Math.round(counter.v)).padStart(2, '0');
  barEl.style.transform = `scaleX(${counter.v / 100})`;
}

const crawl = gsap.to(counter, {
  v: 93, duration: 2.4, ease: 'power1.inOut', onUpdate: renderCount,
});

const fontsReady = Promise.race([
  document.fonts?.ready ?? Promise.resolve(),
  new Promise((r) => setTimeout(r, 2600)),
]);
const minStay = new Promise((r) => setTimeout(r, reducedMotion ? 300 : 1500));

Promise.all([scenePromise.catch(() => {}), fontsReady, minStay]).then(() => {
  crawl.kill();
  gsap.to(counter, {
    v: 100, duration: 0.45, ease: 'power2.out', onUpdate: renderCount,
    onComplete: reveal,
  });
});

function reveal() {
  document.body.removeAttribute('data-loading');
  lenis?.start();

  if (reducedMotion) {
    gsap.set('#veil', { autoAlpha: 0, display: 'none' });
    gsap.set(['#nav', '#rail'], { opacity: 1, y: 0 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.veil-center', { opacity: 0, filter: 'blur(16px)', scale: 1.05, duration: 0.8, ease: 'power2.in' })
    .to('.veil-foot', { opacity: 0, duration: 0.45 }, '<0.1')
    .to('#veil', { opacity: 0, duration: 1.0, ease: 'power2.inOut' }, '-=0.25')
    .set('#veil', { display: 'none' })
    .to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.9 }, '-=0.75')
    .to('.line-inner', { yPercent: 0, duration: 1.5, stagger: 0.13, ease: 'power4.out' }, '-=0.7')
    .to('.hero-sub', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1 }, '-=1.0')
    .to('.hero-cta .btn', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, '-=0.85')
    .to('#nav', { opacity: 1, y: 0, duration: 1.0 }, '-=0.8')
    .to('#rail', { opacity: 1, duration: 0.8 }, '<')
    .to('.scroll-hint', { opacity: 1, duration: 0.8 }, '-=0.5');
}

/* ════════════════════════════════════════════════════════════════
   Scroll choreography (DOM layer)
   ════════════════════════════════════════════════════════════════ */

if (!reducedMotion) {
  gsap.to('.hero-inner', {
    yPercent: -16, opacity: 0, filter: 'blur(9px)', ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 30%', scrub: 0.5 },
  });
  gsap.to('.scroll-hint', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '28% top', scrub: true },
  });

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const isCard = el.classList.contains('card') || el.classList.contains('stack-row');
    const siblings = isCard ? [...el.parentElement.children] : [];
    const delay = isCard ? Math.min(siblings.indexOf(el) * 0.11, 0.55) : 0;
    gsap.fromTo(el,
      { opacity: 0, y: 72, rotateX: 5, filter: 'blur(12px)' },
      {
        opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
        duration: 1.5, delay, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' },
      });
    const line = el.querySelector('.eyebrow-line');
    if (line) {
      gsap.fromTo(line, { scaleX: 0 }, {
        scaleX: 1, duration: 1.3, delay: delay + 0.25, ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' },
      });
    }
  });

  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { yPercent: 118 }, {
      yPercent: 0, duration: 1.2, stagger: 0.08, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' },
    });
  });

  const manifesto = document.getElementById('manifesto-line');
  if (manifesto) {
    const words = splitWords(manifesto, { mask: false });
    gsap.fromTo(words,
      { opacity: 0.07, filter: 'blur(11px)', y: 16 },
      {
        opacity: 1, filter: 'blur(0px)', y: 0, stagger: 0.06, ease: 'none',
        scrollTrigger: { trigger: '#manifesto', start: 'top 62%', end: 'center 42%', scrub: 0.6 },
      });
  }

  // stat counters tick up when the identity panel lands
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%',
      onEnter: () => gsap.to(obj, {
        v: target, duration: 1.6, ease: 'power3.out',
        onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
      }),
      once: true,
    });
  });
} else {
  gsap.set('[data-reveal]', { opacity: 1 });
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = el.dataset.count;
  });
}

/* ── Chapter rail ─────────────────────────────────────────────── */
const railFill = document.getElementById('rail-fill');
const railIdx = document.getElementById('rail-idx');
const railName = document.getElementById('rail-name');

ScrollTrigger.create({
  trigger: '#page', start: 'top top', end: 'bottom bottom',
  onUpdate: (st) => { railFill.style.transform = `scaleY(${st.progress})`; },
});

document.querySelectorAll('[data-chapter]').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: (self) => {
      if (!self.isActive) return;
      if (railIdx.textContent === sec.dataset.idx) return;
      railIdx.textContent = sec.dataset.idx;
      railName.textContent = sec.dataset.chapter;
      gsap.fromTo('.rail-label', { opacity: 0.2 }, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    },
  });
});

/* ════════════════════════════════════════════════════════════════
   Micro-interactions
   ════════════════════════════════════════════════════════════════ */

/* specular highlight follows the cursor across glass */
if (finePointer) {
  for (const el of document.querySelectorAll('.glass, .card, .btn')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    }, { passive: true });
  }
}

/* cards: tactile 3D tilt */
if (finePointer && !reducedMotion) {
  for (const card of document.querySelectorAll('.card')) {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      rx(-ny * 7);
      ry(nx * 9);
    }, { passive: true });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
}

/* magnetic pull on pills and links */
if (finePointer && !reducedMotion) {
  for (const el of document.querySelectorAll('[data-magnetic], .btn')) {
    const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - (r.left + r.width / 2)) * 0.22);
      my((e.clientY - (r.top + r.height / 2)) * 0.3);
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    });
  }
}

/* scramble decode on stack names */
if (finePointer && !reducedMotion) {
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#____';
  for (const el of document.querySelectorAll('[data-scramble]')) {
    const original = el.textContent;
    let raf = 0;
    el.closest('.stack-row')?.addEventListener('pointerenter', () => {
      cancelAnimationFrame(raf);
      const start = performance.now();
      const dur = 620;
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const solid = Math.floor(original.length * p);
        let out = original.slice(0, solid);
        for (let i = solid; i < original.length; i++) {
          out += original[i] === ' ' ? ' '
            : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(step);
        else el.textContent = original;
      };
      raf = requestAnimationFrame(step);
    });
  }
}

/* glass lens cursor */
if (finePointer && !reducedMotion) {
  document.body.classList.add('cursor-on');
  const cursor = document.getElementById('cursor');
  const dotEl = cursor.querySelector('.cursor-dot');
  const lensEl = cursor.querySelector('.cursor-lens');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const dot = { x: pos.x, y: pos.y };
  const lens = { x: pos.x, y: pos.y, s: 1 };
  let pressed = false;

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
  }, { passive: true });
  window.addEventListener('pointerdown', () => { pressed = true; });
  window.addEventListener('pointerup', () => { pressed = false; });

  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('is-link', !!e.target.closest('a, button, .card, .stack-row'));
  });

  gsap.ticker.add(() => {
    dot.x += (pos.x - dot.x) * 0.62;
    dot.y += (pos.y - dot.y) * 0.62;
    lens.x += (pos.x - lens.x) * 0.16;
    lens.y += (pos.y - lens.y) * 0.16;
    lens.s += ((pressed ? 0.78 : 1) - lens.s) * 0.2;
    dotEl.style.transform = `translate(${dot.x}px, ${dot.y}px)`;
    lensEl.style.transform = `translate(${lens.x}px, ${lens.y}px) scale(${lens.s.toFixed(3)})`;
  });
}

/* ── Boot the journey once layout settles ─────────────────────── */
window.addEventListener('load', () => {
  ScrollTrigger.refresh();
  sceneAPI?.buildJourney();
});
fontsReady.then(() => setTimeout(() => ScrollTrigger.refresh(), 60));

window.__app = { sceneAPI, lenis };
