// Light/dark toggle. With no saved choice the page follows the system; the inline script in
// partials/head.html applies a saved choice before first paint.

const KEY = 'theme';
const root = document.documentElement;
const system = window.matchMedia('(prefers-color-scheme: dark)');

const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light');

function apply(theme) {
  const matchesSystem = theme === (system.matches ? 'dark' : 'light');
  // Picking what the system already uses drops the override, so later system changes apply again.
  if (matchesSystem) delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (matchesSystem) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked (private mode): the choice just lasts for this page view
  }
}

export function initTheme() {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;

  const sync = () => button.setAttribute('aria-pressed', String(current() === 'dark'));

  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    sync();
  });
  system.addEventListener('change', sync);

  button.hidden = false;
  sync();
}
