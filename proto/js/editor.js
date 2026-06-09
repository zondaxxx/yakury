// Редактор: сплит код/превью, live-перекомпиляция, публикация ремикса.

import { ARTIFACTS, USERS, byId, BLANK_TEMPLATE } from './data.js';
import { ShaderView } from './gl.js';
import { el, avatar, icon, toast } from './ui.js';

export function renderEditor(view, sourceId) {
  const fromJam = sourceId === 'jam';
  const source = sourceId === 'new' || fromJam ? null : byId(sourceId);
  let initialCode = source ? source.code : BLANK_TEMPLATE;
  if (fromJam) initialCode = sessionStorage.getItem('jam-snapshot') || BLANK_TEMPLATE;

  const canvas = el('canvas', { class: 'editor-canvas' });
  const status = el('div', { class: 'compile-status ok' }, '✓ скомпилировано');
  const ta = el('textarea', {
    class: 'editor-code',
    spellcheck: 'false',
    autocomplete: 'off',
  });
  ta.value = initialCode;

  const titleInput = el('input', {
    class: 'editor-title',
    placeholder: 'Название артефакта…',
    value: source ? `${source.title} (ремикс)` : '',
  });

  const head = el('div', { class: 'editor-head' },
    el('div', { class: 'editor-head-left' },
      source
        ? el('span', { class: 'editor-context' },
            icon('remix'), ' ремикс от ',
            avatar(source.author, 's'),
            el('span', { class: 'handle' }, '@' + USERS[source.author].handle),
            el('a', { class: 'editor-src-link', href: '#/a/' + source.id }, `«${source.title}»`))
        : el('span', { class: 'editor-context' }, icon(fromJam ? 'remix' : 'code'),
            fromJam ? ' снапшот из джема · Prompt night #14' : ' новый артефакт · GLSL'),
      titleInput,
    ),
    el('div', { class: 'editor-head-right' },
      el('span', { class: 'chip chip-engine' }, 'GLSL'),
      el('button', { class: 'btn btn-accent', onclick: publish }, 'Опубликовать'),
    ),
  );

  view.append(
    head,
    el('div', { class: 'editor-split' },
      el('div', { class: 'editor-left glass' }, ta, status),
      el('div', { class: 'editor-right glass' }, canvas),
    ),
  );

  const sv = new ShaderView(canvas);
  let timer = 0;

  function recompile() {
    const res = sv.compile(ta.value);
    if (res.ok) {
      status.className = 'compile-status ok';
      status.textContent = '✓ скомпилировано';
      sv.play();
    } else {
      status.className = 'compile-status err';
      status.textContent = '✗ ' + res.log.trim().split('\n')[0];
    }
  }

  ta.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(recompile, 280);
  });

  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: epos } = ta;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(epos);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
  });

  recompile();

  function publish() {
    const res = sv.compile(ta.value);
    if (!res.ok) { toast('Сначала почини шейдер — он не компилируется'); return; }
    const id = 'u' + Date.now().toString(36);
    ARTIFACTS.unshift({
      id,
      title: titleInput.value.trim() || 'Без названия',
      author: 'you',
      parent: source ? source.id : null,
      sparks: 0, saves: 0, when: 'только что', engine: 'GLSL',
      code: ta.value,
    });
    toast(source
      ? `Опубликовано — дерево «${source.title}» выросло`
      : 'Опубликовано в ленту');
    location.hash = '#/a/' + id;
  }

  return () => { clearTimeout(timer); sv.dispose(); };
}
