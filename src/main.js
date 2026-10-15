import { initRouter } from './router.js';
import { initContact } from './contact.js';

// Router first: it snapshots the untouched page HTML before the form is enhanced.
initRouter();
initContact();
