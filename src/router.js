// Page changes: the eraser rubs the current page out, then the pencil draws the next one in.
// Every route is a real HTML file, so links work without JS; this only upgrades the swap.

const BASE = import.meta.env.BASE_URL; // "/" locally, "/Snoops/" on GitHub Pages
const ROUTES = new Set(['', 'about/', 'projects/', 'contact/'].map((p) => BASE + p));
const ERASE_MS = 500; // keep in sync with --erase-ms in styles.css
const DRAW_MS = 500; // keep in sync with --draw-ms

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const ERASER = `<div class="eraser" aria-hidden="true"><svg class="ink" viewBox="0 0 130 70" focusable="false">
<path class="paperf" style="stroke-width:3" d="M10 18 C40 10 90 12 122 18 L124 54 C92 62 40 60 8 54 Z"></path>
<path class="accf" style="fill-opacity:.9" d="M78 14 C98 13 112 14 122 18 L124 54 C110 57 94 58 80 58 Z"></path>
<path class="thin" d="M20 30 L60 28 M22 42 L54 41"></path>
</svg></div>`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pageBody = () => document.querySelector('[data-page-body]');
const normalise = (pathname) => {
  const p = pathname.replace(/index\.html$/, '');
  return p.endsWith('/') ? p : `${p}/`;
};

const readPage = (doc) => ({
  title: doc.title,
  description: doc.querySelector('meta[name="description"]')?.content ?? '',
  html: doc.querySelector('[data-page-body]').innerHTML,
});

const cache = new Map();

function load(path) {
  if (!cache.has(path)) {
    const page = fetch(path, { headers: { Accept: 'text/html' } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        if (!doc.querySelector('[data-page-body]')) throw new Error('Not a Snoops page');
        return readPage(doc);
      });
    page.catch(() => cache.delete(path)); // let a later attempt retry
    cache.set(path, page);
  }
  return cache.get(path);
}

function markNav(path) {
  for (const link of document.querySelectorAll('.nl')) {
    if (normalise(new URL(link.href).pathname) === path) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

async function erase() {
  const body = pageBody();
  body.insertAdjacentHTML('afterend', ERASER);
  const eraser = body.nextElementSibling;
  body.classList.add('erasing');
  await wait(ERASE_MS);
  eraser.remove();
}

function render(page) {
  const body = pageBody();
  body.innerHTML = page.html; // fresh .drawing node, so the pencil reveal plays
  body.classList.remove('erasing');
  document.title = page.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
  window.scrollTo({ top: 0, behavior: 'instant' });
  body.querySelector('h1')?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('page:enter', { detail: { root: body } }));
}

let current = normalise(location.pathname);
let busy = false;
let queued = null;

async function go(path, push) {
  if (busy) {
    queued = { path, push };
    return;
  }
  if (path === current) return;
  busy = true;

  const main = document.getElementById('main');
  const animate = !reducedMotion.matches;
  const next = load(path);
  markNav(path);
  main.setAttribute('aria-busy', 'true');

  try {
    if (animate) await erase();
    const page = await next;
    if (push) history.pushState(null, '', path);
    current = path;
    render(page);
  } catch {
    // Couldn't fetch or parse the page: fall back to a normal page load rather than a blank sheet.
    location.assign(path);
    return;
  } finally {
    main.removeAttribute('aria-busy');
  }

  if (animate) await wait(DRAW_MS);
  busy = false;
  if (queued) {
    const q = queued;
    queued = null;
    go(q.path, q.push);
  }
}

function routeFor(target) {
  const link = target instanceof Element ? target.closest('a[href]') : null;
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return null;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return null;
  const path = normalise(url.pathname);
  if (!ROUTES.has(path)) return null;
  if (url.hash && path === current) return null; // in-page anchor, e.g. the skip link
  return path;
}

export function initRouter() {
  if (!pageBody() || !window.fetch || !window.DOMParser) return;

  cache.set(current, Promise.resolve(readPage(document)));
  history.scrollRestoration = 'manual';

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const path = routeFor(e.target);
    if (!path) return;
    e.preventDefault();
    go(path, true);
  });

  // Prefetch on intent so the fetch is normally done before the eraser is.
  const prefetch = (e) => {
    const path = routeFor(e.target);
    if (path && path !== current) load(path).catch(() => {});
  };
  document.addEventListener('pointerover', prefetch);
  document.addEventListener('focusin', prefetch);

  window.addEventListener('popstate', () => go(normalise(location.pathname), false));
}
