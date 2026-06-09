// DOM-хелперы, аватары, иконки, тост.

import { USERS } from './data.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const ch of children.flat()) {
    if (ch == null || ch === false) continue;
    node.append(ch.nodeType ? ch : document.createTextNode(ch));
  }
  return node;
}

export function avatar(userId, size = 'm') {
  const u = USERS[userId];
  const node = el('span', { class: `avatar avatar-${size}`, title: '@' + u.handle });
  node.style.background =
    `linear-gradient(135deg, hsl(${u.hue} 70% 62%), hsl(${(u.hue + 70) % 360} 65% 34%))`;
  node.textContent = u.name[0];
  return node;
}

export function paintAvatars(root = document) {
  root.querySelectorAll('.avatar[data-user]').forEach((node) => {
    const u = USERS[node.dataset.user];
    if (!u) return;
    node.style.background =
      `linear-gradient(135deg, hsl(${u.hue} 70% 62%), hsl(${(u.hue + 70) % 360} 65% 34%))`;
    node.textContent = u.name[0];
  });
}

export const ICONS = {
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13 2 4.5 13.5H11L9.5 22 19.5 9.5H13L13 2Z" stroke-linejoin="round"/></svg>',
  remix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="5" r="2.2"/><circle cx="18" cy="5" r="2.2"/><circle cx="12" cy="19" r="2.2"/><path d="M6 7.5v2c0 2.5 6 2.5 6 5v2M18 7.5v2c0 2.5-6 2.5-6 5"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1Z" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5L8 5.5Z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9.2" y="3" width="5.6" height="11" rx="2.8"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7.5 11.5V5.8a1.4 1.4 0 0 1 2.8 0v4.4-6a1.4 1.4 0 0 1 2.8 0v6-4.7a1.4 1.4 0 0 1 2.8 0v5.7-3a1.4 1.4 0 0 1 2.8 0v6.3c0 4-2.6 6.5-6.3 6.5-2.9 0-4.3-1.2-5.8-3.7L4.5 13.7c-.8-1.2.9-2.7 2-1.7l1 1Z" stroke-linejoin="round"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/></svg>',
  headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4.5" height="6.5" rx="2"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="2"/></svg>',
};

export function icon(name) {
  return el('span', { class: 'icon', html: ICONS[name] });
}

let toastTimer = 0;
export function toast(msg) {
  const node = document.getElementById('toast');
  node.textContent = msg;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
}

// Примитивная подсветка GLSL для read-only показа кода.
export function highlightGLSL(src) {
  const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/(\/\/[^\n]*)/g, '<span class="c">$1</span>')
    .replace(/\b(void|float|vec2|vec3|vec4|int|for|if|else|return|uniform|const)\b/g, '<span class="k">$1</span>')
    .replace(/\b(gl_FragColor|gl_FragCoord|u_time|u_res)\b/g, '<span class="u">$1</span>')
    .replace(/\b(sin|cos|atan|length|dot|mix|fract|floor|smoothstep|exp|pow|abs|max|min|step|main)\b(?=\s*\()/g, '<span class="f">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="n">$1</span>');
}
