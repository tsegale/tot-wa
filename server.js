// Tot Wa site server: serves the static site and the contact form API.
require('dotenv').config({ quiet: true });

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'info@tot-wa.com';
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL;

if (!RESEND_API_KEY) {
  console.warn('[contact] RESEND_API_KEY is not set. POST /api/contact will return an error until it is configured.');
}
if (!CONTACT_FROM_EMAIL) {
  console.warn('[contact] CONTACT_FROM_EMAIL is not set. POST /api/contact will return an error until it is configured.');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Services the inquiry form offers. Anything else is rejected.
const SERVICES = {
  'airport-transfer': 'Airport transfer',
  'private-transfer': 'Private transfer',
  tour: 'Tour or safari',
  'custom-tour': 'Custom tour',
  activity: 'Activity',
  'event-transfer': 'Event transfer',
  'vehicle-rental': 'Vehicle rental',
  other: 'Something else',
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function isRealDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const str = (value) => (typeof value === 'string' ? value.trim() : '');

// Validates the fields the contact form actually collects: name, email,
// message required; phone, service, date, pax and route optional. Trims and
// length-caps everything so a bad actor can't send a multi-megabyte payload
// through as "spam filtering".
function validateContactPayload(body) {
  const name = str(body.name);
  const email = str(body.email);
  const phone = str(body.phone);
  const message = str(body.message);
  const service = str(body.service);
  const date = str(body.date);
  const paxRaw = typeof body.pax === 'number' ? String(body.pax) : str(body.pax);
  const route = str(body.route);

  const errors = [];
  if (!name) errors.push('Name is required.');
  else if (name.length > 200) errors.push('Name is too long.');

  if (!email) errors.push('Email is required.');
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.push('Enter a valid email address.');

  if (phone.length > 40) errors.push('Phone number is too long.');

  if (!message) errors.push('Message is required.');
  else if (message.length > 5000) errors.push('Message is too long.');

  if (service && !Object.hasOwn(SERVICES, service)) errors.push('Choose a service from the list.');
  if (date && (!DATE_RE.test(date) || !isRealDate(date))) errors.push('Enter the date as YYYY-MM-DD.');
  let pax = null;
  if (paxRaw) {
    pax = /^\d+$/.test(paxRaw) ? Number(paxRaw) : NaN;
    if (!Number.isInteger(pax) || pax < 1 || pax > 50) errors.push('Travelers must be a whole number from 1 to 50.');
  }
  if (route.length > 120) errors.push('Route is too long (120 characters at most).');

  return { errors, values: { name, email, phone, message, service, date, pax, route } };
}

const app = express();

app.use(express.json());
// The inquiry form posts urlencoded when JavaScript is unavailable.
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
// The site lives at the repo root (so GitHub Pages can serve it), but only
// ./assets and the root-level .html pages are web-servable. server.js,
// package.json, .env, node_modules etc. stay off-limits, which is why this
// is not a plain express.static on __dirname.
const PAGES = new Set(fs.readdirSync(__dirname).filter((file) => file.endsWith('.html')));

app.use('/assets', express.static(path.join(__dirname, 'assets')));

for (const file of ['robots.txt', 'sitemap.xml']) {
  app.get(`/${file}`, (req, res, next) => {
    res.sendFile(path.join(__dirname, file), (err) => {
      if (err) next(err);
    });
  });
}

app.get('/{:page}', (req, res, next) => {
  const requested = req.params.page || 'index.html';
  const page = requested.endsWith('.html') ? requested : `${requested}.html`;
  if (!PAGES.has(page)) return next();
  res.sendFile(path.join(__dirname, page), (err) => {
    if (err) next(err);
  });
});

app.post('/api/contact', async (req, res) => {
  const body = req.body || {};
  // A no-JS form post expects a page, not JSON: send it back to the contact
  // page, which reads the outcome from the query string.
  const isFormPost = Boolean(req.is('application/x-www-form-urlencoded'));
  const reply = (status, payload) => {
    if (isFormPost) return res.redirect(303, payload.ok ? '/contact.html?sent=1#inquiry' : '/contact.html?error=1#inquiry');
    return res.status(status).json(payload);
  };

  // Honeypot: a hidden field real visitors never see or fill. Bots that
  // auto-fill every input on the form will fill it, so a non-empty value
  // means spam. Respond as if it succeeded, so the bot has no signal to
  // adapt to, but don't actually send anything.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return reply(200, { ok: true });
  }

  const { errors, values } = validateContactPayload(body);
  if (errors.length) {
    return reply(400, { ok: false, error: errors[0], errors });
  }

  if (!resend || !CONTACT_FROM_EMAIL) {
    console.error('[contact] Submission received but Resend is not configured (missing RESEND_API_KEY or CONTACT_FROM_EMAIL).');
    return reply(500, {
      ok: false,
      error: "The contact form isn't set up yet. Please email info@tot-wa.com directly.",
    });
  }

  const { name, email, phone, message, service, date, pax, route } = values;

  // Trip details sit at the top of the internal email as a small table.
  const tripRows = [
    service ? ['Service', SERVICES[service]] : null,
    date ? ['Date', date] : null,
    pax ? ['Travelers', String(pax)] : null,
    route ? ['Route or tour', route] : null,
  ].filter(Boolean);
  const contactRows = [['Name', name], ['Email', email], phone ? ['Phone', phone] : null].filter(Boolean);
  const tableHtml = (rows) => `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><th align="left" style="border-bottom:1px solid #ddd">${escapeHtml(k)}</th><td style="border-bottom:1px solid #ddd">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>`;

  try {
    const { error } = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `New website enquiry from ${name}`,
      text: [
        ...tripRows.map(([k, v]) => `${k}: ${v}`),
        tripRows.length ? '' : null,
        ...contactRows.map(([k, v]) => `${k}: ${v}`),
        '',
        message,
      ].filter((line) => line !== null).join('\n'),
      html: [
        tripRows.length ? tableHtml(tripRows) : '',
        tableHtml(contactRows),
        `<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(message)}</p>`,
      ].join('<br>'),
    });
    if (error) throw new Error(error.message || 'Resend rejected the message.');
  } catch (err) {
    console.error('[contact] Failed to send notification email:', err);
    return reply(502, {
      ok: false,
      error: "Couldn't send your message right now. Please try again, or email info@tot-wa.com directly.",
    });
  }

  // The enquiry has already reached info@tot-wa.com at this point, so a
  // failed confirmation email is logged, not surfaced as a request failure.
  try {
    const { error } = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: email,
      subject: "We've got your message - Tot Wa",
      text: `Hi ${name},\n\nThanks for getting in touch with Tot Wa. We've received your message and will reply within one business day.\n\nIf it's urgent, call or WhatsApp us on +264 81 600 8766.\n\nTot Wa Tours & Transfers`,
    });
    if (error) console.warn('[contact] Notification sent, but confirmation email failed:', error);
  } catch (err) {
    console.warn('[contact] Notification sent, but confirmation email failed:', err);
  }

  return reply(200, { ok: true });
});

app.listen(PORT, () => {
  console.log(`Tot Wa server listening on http://localhost:${PORT}`);
});
