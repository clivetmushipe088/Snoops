import { initRouter } from './router.js';
import { initContact } from './contact.js';
import { initTheme } from './theme.js';

// Router first: it snapshots the untouched page HTML before the form is enhanced.
initRouter();
initContact();
initTheme();
