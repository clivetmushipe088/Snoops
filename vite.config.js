import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;
const partialsDir = resolve(root, 'src/partials');
// Where the site is served from. "/" locally; the GitHub Pages workflow sets BASE_PATH=/<repo>/.
const base = process.env.BASE_PATH || '/';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Tiny HTML templating so the four pages can share markup without a framework.
 *
 *   <!-- @include header.html page=about -->   inline src/partials/header.html; `page`
 *                                              marks the matching nav link aria-current
 *   {{VITE_SOMETHING}}                         HTML-escaped value from .env
 *   <!-- @if VITE_SOMETHING --> … <!-- @endif -->  kept only when that value is set
 *
 * Internal links are written root-relative (<a href="/about/">) and get the base path
 * prefixed here, since Vite only rewrites asset URLs, not anchors.
 */
function htmlPartials() {
  let env = {};

  const render = (html) =>
    html
      .replace(/<!-- @include (\S+)(?: page=(\w+))? -->/g, (_, file, page) => {
        let out = readFileSync(resolve(partialsDir, file), 'utf8');
        if (page) out = out.replace(`data-route="${page}"`, `data-route="${page}" aria-current="page"`);
        return out;
      })
      .replace(/<!-- @if (\w+) -->([\s\S]*?)<!-- @endif -->/g, (_, key, body) => (env[key] ? body : ''))
      .replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(env[key] ?? ''))
      .replace(/(<a\b[^>]*?\shref=")\/(?!\/)/g, `$1${base}`);

  return {
    name: 'html-partials',
    configResolved(config) {
      env = config.env;
      if (config.command === 'build' && !/^https:\/\//.test(env.VITE_CONTACT_ENDPOINT ?? '')) {
        config.logger.warn(
          '\n[snoops] VITE_CONTACT_ENDPOINT is not set, so the contact form will show a "not connected" error. See .env.example.\n',
        );
      }
    },
    transformIndexHtml: { order: 'pre', handler: render },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(partialsDir)) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  base,
  appType: 'mpa',
  plugins: [htmlPartials()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        about: resolve(root, 'about/index.html'),
        projects: resolve(root, 'projects/index.html'),
        contact: resolve(root, 'contact/index.html'),
      },
    },
  },
});
