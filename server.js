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

// Validates the fields the contact form actually collects: name, email,
// message required; phone optional. Trims and length-caps everything so a
// bad actor can't send a multi-megabyte payload through as "spam filtering".
function validateContactPayload(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  const errors = [];
  if (!name) errors.push('Name is required.');
  else if (name.length > 200) errors.push('Name is too long.');

  if (!email) errors.push('Email is required.');
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.push('Enter a valid email address.');

  if (phone.length > 40) errors.push('Phone number is too long.');

  if (!message) errors.push('Message is required.');
  else if (message.length > 5000) errors.push('Message is too long.');

  return { errors, values: { name, email, phone, message } };
}

const app = express();

app.use(express.json());
// The site lives at the repo root (so GitHub Pages can serve it), but only
// ./assets and the root-level .html pages are web-servable. server.js,
// package.json, .env, node_modules etc. stay off-limits, which is why this
// is not a plain express.static on __dirname.
const PAGES = new Set(fs.readdirSync(__dirname).filter((file) => file.endsWith('.html')));

app.use('/assets', express.static(path.join(__dirname, 'assets')));

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

  // Honeypot: a hidden field real visitors never see or fill. Bots that
  // auto-fill every input on the form will fill it, so a non-empty value
  // means spam. Respond as if it succeeded, so the bot has no signal to
  // adapt to, but don't actually send anything.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.json({ ok: true });
  }

  const { errors, values } = validateContactPayload(body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors[0], errors });
  }

  if (!resend || !CONTACT_FROM_EMAIL) {
    console.error('[contact] Submission received but Resend is not configured (missing RESEND_API_KEY or CONTACT_FROM_EMAIL).');
    return res.status(500).json({
      ok: false,
      error: "The contact form isn't set up yet. Please email info@tot-wa.com directly.",
    });
  }

  const { name, email, phone, message } = values;

  try {
    const { error } = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `New website enquiry from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        '',
        message,
      ].filter((line) => line !== null).join('\n'),
    });
    if (error) throw new Error(error.message || 'Resend rejected the message.');
  } catch (err) {
    console.error('[contact] Failed to send notification email:', err);
    return res.status(502).json({
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

  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Tot Wa server listening on http://localhost:${PORT}`);
});
