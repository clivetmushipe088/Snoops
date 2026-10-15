// Contact form: inline validation, a clear "what's still needed" hint, and a real POST to
// VITE_CONTACT_ENDPOINT (a Formspree-compatible URL baked into the form's action at build time).
// Without JS the form still posts natively to the same endpoint.

const TIMEOUT_MS = 15000;

const LABELS = { name: 'your name', email: 'your email', message: 'your big idea' };

function problem(field) {
  const value = field.value.trim();
  switch (field.name) {
    case 'name':
      return value ? '' : 'Please tell us your name.';
    case 'email':
      if (!value) return 'We need your email so we can write back.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'That email looks incomplete. It should look like name@example.com.';
    case 'message':
      if (!value) return 'Tell us a little about your idea.';
      return value.length >= 10 ? '' : 'A few more words, please (at least 10 characters).';
    default:
      return '';
  }
}

const listMissing = (names) =>
  names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

const enhanced = new WeakSet();

function enhance(root) {
  const form = root.querySelector('form[data-contact]');
  if (!form || enhanced.has(form)) return;
  enhanced.add(form);
  form.noValidate = true; // we show our own messages; native bubbles stay as the no-JS fallback

  const fields = [...form.querySelectorAll('input[name="name"], input[name="email"], textarea[name="message"]')];
  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector('[data-label]');
  const hint = form.querySelector('.form-hint');
  const status = form.querySelector('.form-status');
  const alert = form.querySelector('.form-alert');
  const counter = form.querySelector('.field-count');
  const message = form.querySelector('textarea[name="message"]');
  const email = form.dataset.email;
  let sending = false;

  const showError = (field, text) => {
    const wrap = field.closest('.field');
    document.getElementById(`${field.id}-err`).textContent = text;
    field.setAttribute('aria-invalid', text ? 'true' : 'false');
    wrap.toggleAttribute('data-invalid', Boolean(text));
  };

  const refresh = () => {
    const missing = fields.filter((f) => problem(f)).map((f) => LABELS[f.name]);
    button.setAttribute('aria-disabled', String(missing.length > 0 || sending));
    hint.textContent = missing.length ? `Still needed: ${listMissing(missing)}.` : 'Ready when you are.';
    counter.textContent = `${message.value.length} / ${message.maxLength}`;
  };

  const setAlert = (text) => {
    alert.textContent = text;
    if (text && email) {
      alert.append(' Or write to us directly at ');
      const a = document.createElement('a');
      a.href = `mailto:${email}`;
      a.textContent = email;
      alert.append(a, '.');
    }
  };

  for (const field of fields) {
    // Validate when they leave a field they've touched, then clear errors live as they fix them.
    field.addEventListener('blur', () => {
      if (field.value.trim() || field.hasAttribute('aria-invalid')) showError(field, problem(field));
    });
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') showError(field, problem(field));
      status.textContent = '';
      refresh();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    setAlert('');
    status.textContent = '';

    const invalid = fields.filter((f) => {
      const text = problem(f);
      showError(f, text);
      return text;
    });
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    const endpoint = form.getAttribute('action') ?? '';
    if (!/^https:\/\//.test(endpoint)) {
      setAlert("Sorry, this form isn't connected to a mailbox yet, so nothing was sent. Your message is still here.");
      return;
    }

    const data = new FormData(form);
    if (data.get('_gotcha')) {
      // Bots fill the hidden field. Pretend it worked and send nothing.
      form.reset();
      status.textContent = "Noted! We'll write back soon.";
      refresh();
      return;
    }

    sending = true;
    label.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    refresh();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const reason = body.errors?.map((x) => x.message).join(' ') || `the mail server answered with error ${res.status}`;
        setAlert(`We couldn't send your message: ${reason}. Please check the fields and try again.`);
        return;
      }
      form.reset();
      for (const f of fields) showError(f, '');
      status.textContent = "Noted! We'll write back soon.";
    } catch (err) {
      const why = err.name === 'TimeoutError' ? 'The mail server took too long to answer' : "We couldn't reach the mail server (check your connection)";
      setAlert(`${why}, so your message wasn't sent. It's still here, so you can press "Send it" to try again.`);
    } finally {
      sending = false;
      label.textContent = 'Send it';
      form.removeAttribute('aria-busy');
      refresh();
    }
  });

  refresh();
}

export function initContact() {
  enhance(document);
  document.addEventListener('page:enter', (e) => enhance(e.detail.root));
}
