// Роутер по hash + оболочка.

import { renderFeed } from './feed.js';
import { renderArtifact } from './artifact.js';
import { renderEditor } from './editor.js';
import { renderJam } from './jam.js';
import { paintAvatars } from './ui.js';

const view = document.getElementById('view');
let cleanup = null;

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  view.innerHTML = '';
  view.scrollTop = 0;
  window.scrollTo(0, 0);

  const hash = location.hash.replace(/^#\/?/, '');
  const [page, arg] = hash.split('/');

  document.querySelectorAll('.tabs a').forEach((a) => {
    const tab = a.dataset.tab;
    a.classList.toggle('active',
      (tab === 'feed' && !page) || (tab === 'jam' && page === 'jam'));
  });

  view.className = 'view-' + (page || 'feed');

  if (!page) cleanup = renderFeed(view);
  else if (page === 'a' && arg) cleanup = renderArtifact(view, arg);
  else if (page === 'edit' && arg) cleanup = renderEditor(view, arg);
  else if (page === 'jam') cleanup = renderJam(view);
  else cleanup = renderFeed(view);
}

window.addEventListener('hashchange', route);
paintAvatars();
route();
