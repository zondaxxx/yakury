// Страница артефакта: большой live-канвас, код, дерево ремиксов.

import { USERS, byId, childrenOf, rootOf, diffLines } from './data.js';
import { ShaderView, posterDataURL } from './gl.js';
import { el, avatar, icon, toast, highlightGLSL } from './ui.js';

export function renderArtifact(view, id) {
  const a = byId(id);
  if (!a) { view.append(el('p', { class: 'empty' }, 'Артефакт не найден.')); return () => {}; }

  const u = USERS[a.author];
  const parent = a.parent ? byId(a.parent) : null;
  const root = rootOf(a);

  const canvas = el('canvas', { class: 'hero-canvas' });

  const head = el('div', { class: 'art-head' },
    el('div', { class: 'art-title-block' },
      el('h1', { class: 'art-title' }, a.title),
      el('div', { class: 'art-byline' },
        avatar(a.author, 's'),
        el('span', { class: 'handle' }, '@' + u.handle),
        el('span', { class: 'card-when' }, '· ' + a.when),
        el('span', { class: 'chip chip-engine' }, a.engine),
        parent && el('span', { class: 'chip chip-diff' },
          `ремикс · изменено ${diffLines(a.code, parent.code)} строк`),
      ),
    ),
    el('div', { class: 'art-actions' },
      actionBtn('spark', `${a.sparks}`, () => toast('⚡ Спарк отправлен @' + u.handle)),
      el('a', { class: 'btn btn-accent', href: '#/edit/' + a.id }, 'Ремикс'),
      actionBtn('save', 'Сохранить', () => toast('Добавлено в сохранённые')),
      el('button', {
        class: 'btn btn-ghost',
        onclick: () => toast('Embed-код скопирован: <iframe src="spectra.app/e/' + a.id + '">'),
      }, 'Embed'),
    ),
  );

  const codePane = el('section', { class: 'pane glass' },
    el('h3', { class: 'pane-title' }, icon('code'), ' Код'),
    el('pre', { class: 'code-view', html: highlightGLSL(a.code) }),
  );

  const treePane = el('section', { class: 'pane glass' },
    el('h3', { class: 'pane-title' }, icon('remix'), ' Дерево ремиксов'),
    treeNode(root, a.id, 0),
  );

  view.append(
    el('div', { class: 'art-stage glass' }, canvas),
    head,
    el('div', { class: 'art-columns' }, codePane, treePane),
  );

  const sv = new ShaderView(canvas);
  const res = sv.compile(a.code);
  if (res.ok) sv.play();

  return () => sv.dispose();
}

function actionBtn(ic, label, fn) {
  return el('button', { class: 'btn btn-ghost', onclick: fn }, icon(ic), ' ' + label);
}

function treeNode(a, currentId, depth) {
  const u = USERS[a.author];
  const poster = posterDataURL(a.id, a.code, 96, 64);
  const row = el('a', {
    class: 'tree-row' + (a.id === currentId ? ' current' : ''),
    href: '#/a/' + a.id,
    style: `margin-left:${depth * 26}px`,
  },
    depth > 0 && el('span', { class: 'tree-elbow' }),
    poster
      ? el('img', { class: 'tree-poster', src: poster, alt: '' })
      : el('span', { class: 'tree-poster' }),
    el('span', { class: 'tree-label' },
      el('span', { class: 'tree-title' }, a.title),
      el('span', { class: 'tree-author' }, '@' + u.handle),
    ),
    el('span', { class: 'tree-sparks' }, '⚡ ' + a.sparks),
  );
  const wrap = el('div', {}, row);
  for (const ch of childrenOf(a.id)) wrap.append(treeNode(ch, currentId, depth + 1));
  return wrap;
}
