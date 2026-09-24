# Tot Wa Tours & Transfers

Static marketing site plus an Express backend for the contact form. Previewed on GitHub
Pages under `/tot-wa/`, live on `tot-wa.com`; all paths are relative so both work.

## Run locally

```
npm install
cp .env.example .env   # fill in RESEND_API_KEY and CONTACT_FROM_EMAIL
npm start               # or: npm run dev (auto-restarts on change)
```

Serves the site and the API on http://localhost:3000 (or `PORT` from `.env`).
`npm run serve` serves the files statically instead (no contact API), the way GitHub
Pages does.

## Project structure

```
index.html, about.html, ...   site pages, at the repo root so GitHub Pages serves them
tour-*.html                   GENERATED tour detail pages (see below)
templates/tour.html           template for the tour detail pages
assets/css/style.css          the whole design system
assets/js/                    site scripts and data files
assets/images/                photos, generated variants, og cards (credits in CREDITS.md)
assets/fonts/                 self-hosted Abel Pro web fonts
scripts/                      build scripts (Node)
tests/ui.spec.js              Playwright + axe UI checks
server.js                     Express server: pages, assets/, sitemap, POST /api/contact
CONTENT-TODO.md               content still needed from the client
```

## Editing content

Business data lives in plain JS files under `assets/js/` and is shared by the pages and
the build scripts:

- `tours-data.js`: tour packages (prices, routes, highlights, stops, itineraries)
- `transfers-data.js`: airports, Windhoek suburbs, fares, fleet
- `site-config.js`: phone, email, addresses, hours
- `reviews-data.js`: fallback reviews if the Elfsight widget fails

Prices and fares render in the browser, so changing them needs no build. Anything else
needs a rebuild.

## Builds

The header, footer, `<head>` and a few content blocks are rendered into every page
between marker comments such as `<!-- @header -->...<!-- /@header -->`. Edit
`scripts/lib/site.js` (chrome) or `scripts/lib/blocks.js` (blocks), never the rendered
output, then rebuild.

```
npm run build          # tour pages + sitemap, then every page's shared blocks
npm run build:images   # responsive WebP variants, hero crops, og cards, manifest
```

`build:images` needs `sharp` (a dev dependency) and only writes what changed. Run it,
then `npm run build`, whenever you add or replace a photo.

## Booking

`assets/js/booking.js` validates every booking form. Until `BOOKING_CONFIG.easyotaUrl`
is set, a valid form offers "Continue on WhatsApp" (prefilled message) or "Send an
inquiry" (prefilled contact form). Once set, it opens the EasyOTA embed in a dialog.

## Contact form

`POST /api/contact` validates `name`, `email`, `message` (required), `phone`, `service`
(whitelisted), `date` (YYYY-MM-DD), `pax` (1 to 50) and `route` (120 characters max)
server-side, silently drops submissions where the hidden `website` honeypot field is
filled, and sends the enquiry via [Resend](https://resend.com) to `CONTACT_TO_EMAIL`
with `reply-to` set to the submitter, plus a short confirmation email back to them.
Without JavaScript the form posts urlencoded and the server redirects back to
`contact.html` with the outcome.

`CONTACT_FROM_EMAIL` must be on a domain verified in Resend
(https://resend.com/domains). `tot-wa.com` needs to be verified there before this will
actually send.

## Tests

```
npx playwright install chromium   # once
npm run test:ui
```

Checks every page, including the generated tour pages, at 390, 820 and 1440 wide: no
horizontal overflow, no serious or critical axe violations, every button leads somewhere,
the mobile drawer, header contrast, a 13px minimum text size and no placeholder text.
