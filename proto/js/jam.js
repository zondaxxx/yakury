// Джем-комната (мок): хост «печатает» код в прямом эфире, шейдер живёт,
// голосовой UI — спикеры/слушатели/рука. Видео не стримится: синкается код.

import { el, avatar, icon, toast } from './ui.js';
import { ShaderView } from './gl.js';
import { USERS } from './data.js';

const STEPS = [
  {
    caption: { who: 'kira', text: 'Так, тема — «одна формула». Начнём с расстояния до центра и синуса.' },
    code: `// prompt night #14 — «одна формула»
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float d = length(uv);
  float w = sin(d * 14.0 - u_time * 3.0);
  gl_FragColor = vec4(vec3(w * 0.5 + 0.5), 1.0);
}`,
  },
  {
    caption: { who: 'kira', text: 'Подмешаем угол — пусть кольца закрутятся в спираль.' },
    code: `// prompt night #14 — «одна формула»
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float a = atan(uv.y, uv.x);
  float d = length(uv);
  float w = sin(d * 14.0 - u_time * 3.0 + a * 3.0);
  gl_FragColor = vec4(vec3(w * 0.5 + 0.5), 1.0);
}`,
  },
  {
    caption: { who: 'den', text: 'Дай палитру через косинус, классика же.' },
    code: `// prompt night #14 — «одна формула»
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float a = atan(uv.y, uv.x);
  float d = length(uv);
  float w = sin(d * 14.0 - u_time * 3.0 + a * 3.0);
  vec3 col = 0.5 + 0.5 * cos(w * 2.0 + vec3(0.0, 2.1, 4.2) + u_time * 0.3);
  col *= smoothstep(1.7, 0.25, d);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    caption: { who: 'kira', text: 'Во. Жмите «Ремикс» — забирайте состояние к себе и крутите дальше.' },
    code: `// prompt night #14 — «одна формула»
// итог эфира — ремиксуйте
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float a = atan(uv.y, uv.x);
  float d = length(uv);
  float w = sin(d * 14.0 - u_time * 3.0 + a * 3.0 + sin(u_time * 0.5) * 2.0);
  vec3 col = 0.5 + 0.5 * cos(w * 2.0 + vec3(0.0, 2.1, 4.2) + u_time * 0.3);
  col *= smoothstep(1.7, 0.25, d);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
];

const START_CODE = `// prompt night #14 — «одна формула»
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float d = length(uv);
  float glow = 0.05 / (0.25 + d * d * 2.0);
  vec3 col = vec3(0.02, 0.022, 0.03) + vec3(0.5, 0.55, 0.7) * glow * (0.8 + 0.2 * sin(u_time));
  gl_FragColor = vec4(col, 1.0);
}`;

export function renderJam(view) {
  const canvas = el('canvas', { class: 'jam-canvas' });
  const codePre = el('pre', { class: 'jam-code' });
  const captionBox = el('div', { class: 'jam-caption' });
  const listenersCount = el('span', {}, '47');

  const hostCell = speakerCell('kira', 'хост');
  const denCell = speakerCell('den', 'спикер');

  const handBtn = el('button', { class: 'btn btn-ghost jam-hand' }, icon('hand'), ' Поднять руку');
  handBtn.addEventListener('click', () => {
    const on = handBtn.classList.toggle('on');
    toast(on ? '✋ Вы в очереди — хост видит вашу руку' : 'Рука опущена');
  });

  view.append(
    el('div', { class: 'jam-head' },
      el('span', { class: 'badge-live' }, el('span', { class: 'live-dot' }), 'LIVE'),
      el('h1', { class: 'jam-title' }, 'Prompt night #14 — «одна формула»'),
      el('span', { class: 'jam-listeners' }, icon('headphones'), ' ', listenersCount, ' слушают'),
    ),
    el('div', { class: 'jam-main' },
      el('div', { class: 'jam-stage glass' }, canvas, captionBox),
      el('div', { class: 'jam-side glass' },
        el('div', { class: 'jam-side-head' },
          el('span', {}, 'код эфира · синк ~40 байт/с'),
          el('button', {
            class: 'btn btn-accent btn-s',
            onclick: () => {
              sessionStorage.setItem('jam-snapshot', typer.text);
              location.hash = '#/edit/jam';
            },
          }, 'Ремикс'),
        ),
        codePre,
      ),
    ),
    el('div', { class: 'jam-bar glass' },
      el('div', { class: 'jam-speakers' },
        hostCell.node, denCell.node,
        el('div', { class: 'speaker-cell empty-slot' },
          el('span', { class: 'avatar avatar-m slot' }, '+'),
          el('span', { class: 'speaker-name' }, 'свободно'),
        ),
      ),
      el('div', { class: 'jam-listeners-row' },
        ['sol', 'ann', 'rey', 'mura', 'you'].map((u) => avatar(u, 's')),
        el('span', { class: 'more-listeners' }, '+42'),
      ),
      el('div', { class: 'jam-controls' },
        handBtn,
        el('button', { class: 'btn btn-ghost', disabled: true, title: 'Микрофон — только у спикеров' }, icon('mic')),
        el('a', { class: 'btn btn-leave', href: '#/' }, 'Покинуть'),
      ),
    ),
  );

  // ── живой шейдер ───────────────────────────────────────────────
  const sv = new ShaderView(canvas);
  sv.compile(START_CODE);
  sv.play();

  // ── печатающий хост ───────────────────────────────────────────
  const typer = { text: START_CODE, caret: START_CODE.length };
  let stepIdx = 0;
  let queue = [];
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function renderCode() {
    codePre.textContent = '';
    codePre.append(
      el('span', {}, typer.text.slice(0, typer.caret)),
      el('span', { class: 'caret' }),
      el('span', {}, typer.text.slice(typer.caret)),
    );
    codePre.scrollTop = codePre.scrollHeight;
  }

  function planEdit(target) {
    let pre = 0;
    const a = typer.text, b = target;
    while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    let suf = 0;
    while (suf < a.length - pre && suf < b.length - pre &&
           a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
    queue = [];
    for (let i = 0; i < a.length - pre - suf; i++) queue.push({ del: true, at: pre });
    for (let i = pre; i < b.length - suf; i++) queue.push({ ins: b[i], at: pre });
    typer.caret = pre + (a.length - pre - suf);
  }

  let compileTick = 0;
  function tick() {
    if (!queue.length) return;
    const op = queue.shift();
    if (op.del) {
      typer.text = typer.text.slice(0, typer.caret - 1) + typer.text.slice(typer.caret);
      typer.caret--;
    } else {
      typer.text = typer.text.slice(0, typer.caret) + op.ins + typer.text.slice(typer.caret);
      typer.caret++;
    }
    renderCode();
    if (++compileTick % 6 === 0 || !queue.length) sv.compile(typer.text);
    if (queue.length) {
      const pause = op.ins === '\n' ? 140 : (Math.random() < 0.04 ? 300 : 16 + Math.random() * 30);
      later(tick, op.del ? 12 : pause);
    } else {
      sv.compile(typer.text);
      later(nextStep, 5200);
    }
  }

  function showCaption(c) {
    const u = USERS[c.who];
    captionBox.innerHTML = '';
    captionBox.append(avatar(c.who, 's'),
      el('span', { class: 'cap-text' },
        el('b', {}, '@' + u.handle + ': '), c.text));
    captionBox.classList.add('show');
    hostCell.speaking(c.who === 'kira');
    denCell.speaking(c.who === 'den');
  }

  function nextStep() {
    const step = STEPS[stepIdx % STEPS.length];
    stepIdx++;
    showCaption(step.caption);
    later(() => { planEdit(step.code); tick(); }, 1400);
  }

  renderCode();
  later(nextStep, 1200);

  // ── жизнь вокруг ──────────────────────────────────────────────
  let listeners = 47;
  const crowd = setInterval(() => {
    listeners = Math.max(40, listeners + Math.round(Math.random() * 4 - 1.4));
    listenersCount.textContent = String(listeners);
  }, 4000);
  later(() => toast('✋ @sol.frag подняла руку'), 16000);

  return () => {
    timers.forEach(clearTimeout);
    clearInterval(crowd);
    sv.dispose();
  };
}

function speakerCell(userId, role) {
  const av = avatar(userId, 'm');
  const node = el('div', { class: 'speaker-cell' },
    el('span', { class: 'speak-ring' }, av),
    el('span', { class: 'speaker-name' }, '@' + USERS[userId].handle),
    el('span', { class: 'speaker-role' }, role),
  );
  return {
    node,
    speaking(on) { node.classList.toggle('speaking', on); },
  };
}
