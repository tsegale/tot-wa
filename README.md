# Tot Wa Tours & Transfers

Static marketing site plus an Express backend for the contact form.

## Run locally

```
npm install
cp .env.example .env   # fill in RESEND_API_KEY and CONTACT_FROM_EMAIL
npm start               # or: npm run dev (auto-restarts on change)
```

Serves the site and the API on http://localhost:3000 (or `PORT` from `.env`).

## Contact form

`POST /api/contact` validates `name`, `email`, `message` (required) and
`phone` (optional) server-side, silently drops submissions where the
hidden `website` honeypot field is filled, and sends the enquiry via
[Resend](https://resend.com) to `CONTACT_TO_EMAIL` with `reply-to` set to
the submitter, plus a short confirmation email back to them.

`CONTACT_FROM_EMAIL` must be on a domain verified in Resend
(https://resend.com/domains) - `tot-wa.com` needs to be verified there
before this will actually send.
