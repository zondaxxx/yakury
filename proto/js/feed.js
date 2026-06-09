// Лента: карточки с механикой постер → live (IntersectionObserver + лимит контекстов).

import { ARTIFACTS, USERS, byId, childrenOf } from './data.js';
import { ShaderView, requestPlay, releasePlay } from './gl.js';
import { el, avatar, icon, toast } from './ui.js';

export function renderFeed(view) {
  const views = [];

  const banner = el('div', { class: 'prompt-banner glass' },
    el('span', { class: 'prompt-chip' }, 'промпт недели'),
    el('span', { class: 'prompt-title' }, '«Одна формула»'),
    el('span', { class: 'prompt-meta' }, 'осталось 3 дня · 12 работ · разбор в джеме в пятницу'),
    el('a', { class: 'btn btn-ghost', href: '#/edit/new' }, 'участвовать'),
  );

  const grid = el('div', { class: 'feed-grid' });

  for (const a of ARTIFACTS) {
    grid.append(card(a, views));
  }

  view.append(banner, grid);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const sv = e.target._shaderView;
      if (!sv) continue;
      if (e.isIntersecting && e.intersectionRatio >= 0.5) requestPlay(sv);
      else releasePlay(sv);
    }
  }, { threshold: [0, 0.5] });

  grid.querySelectorAll('.card-canvas').forEach((c) => io.observe(c));

  return () => {
    io.disconnect();
    views.forEach((v) => v.dispose());
  };
}

function card(a, views) {
  const u = USERS[a.author];
  const parent = a.parent ? byId(a.parent) : null;
  const remixes = countDescendants(a.id);

  const canvas = el('canvas', { class: 'card-canvas' });
  const liveTag = el('span', { class: 'live-tag' }, 'live');

  const node = el('article', { class: 'card glass' },
    el('a', { class: 'card-stage', href: '#/a/' + a.id },
      canvas, liveTag,
      el('span', { class: 'chip chip-engine' }, a.engine),
    ),
    el('div', { class: 'card-body' },
      el('div', { class: 'card-title-row' },
        el('a', { class: 'card-title', href: '#/a/' + a.id }, a.title),
        el('span', { class: 'card-when' }, a.when),
      ),
      parent && el('a', { class: 'card-remix-of', href: '#/a/' + parent.id },
        icon('remix'), ` ремикс «${parent.title}» @${USERS[parent.author].handle}`),
      el('div', { class: 'card-meta' },
        avatar(a.author, 's'),
        el('span', { class: 'handle' }, '@' + u.handle),
        el('span', { class: 'spacer' }),
        statBtn('spark', a),
        el('a', { class: 'stat', href: '#/edit/' + a.id, title: 'Ремикс' },
          icon('remix'), String(remixes)),
        el('span', { class: 'stat', title: 'Сохранения' }, icon('save'), String(a.saves)),
      ),
    ),
  );

  const sv = new ShaderView(canvas);
  canvas._shaderView = sv;
  views.push(sv);
  const res = sv.compile(a.code);
  if (res.ok) {
    requestAnimationFrame(() => sv.renderOnce());
  } else {
    node.querySelector('.card-stage').classList.add('broken');
  }

  const origPlay = sv.play.bind(sv);
  const origPause = sv.pause.bind(sv);
  sv.play = () => { origPlay(); liveTag.classList.add('on'); };
  sv.pause = () => { origPause(); liveTag.classList.remove('on'); };

  return node;
}

function statBtn(kind, a) {
  const btn = el('button', { class: 'stat stat-btn' }, icon(kind), String(a.sparks));
  btn.addEventListener('click', () => {
    const on = btn.classList.toggle('on');
    a.sparks += on ? 1 : -1;
    btn.lastChild.textContent = String(a.sparks);
    if (on) toast('⚡ Спарк отправлен @' + USERS[a.author].handle);
  });
  return btn;
}

function countDescendants(id) {
  let n = 0;
  const stack = [id];
  while (stack.length) {
    for (const ch of childrenOf(stack.pop())) { n++; stack.push(ch.id); }
  }
  return n;
}
