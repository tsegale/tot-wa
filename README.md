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
tests/easyota.spec.js         EasyOTA widget checks against a mocked API
assets/vendor/easyota/        EasyOTA booking widget, vendored unmodified (see below)
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

`assets/js/booking.js` validates every booking form. A valid form offers "Continue on
WhatsApp" (prefilled message) or "Send an inquiry" (prefilled contact form).

## EasyOTA widget

Transfer searches can also run through EasyOTA's booking widget, which renders in the
page (no iframe) and hands over with a full-page redirect to `book.tot-wa.com`. It
mounts in three places: the Transfer tab of the home ticket, the booking area of the
airport and private transfer pages, and the Transfer tab of the "Book now" dialog on
every other page. Tours and activities keep the WhatsApp / inquiry handoff.

**Supplier lookup.** The widget builds its API host from the page hostname: it strips
`www.` and prefixes `book.`, so on `tot-wa.com` it reads
`https://book.tot-wa.com/api/suppliers/book.tot-wa.com`. That record supplies the tabs,
locations, settings and colors.

**Staging.** On any host not listed in `easyota.productionHosts` (GitHub Pages,
localhost), `booking.js` adds `?fixedHost=book.tot-wa.com` to the URL with
`history.replaceState` before injecting the script, keeping other params and the hash.
Without it the widget would look up `book.<preview host>`, or EasyOTA's demo supplier on
localhost.

**When it shows.** Before mounting, `booking.js` checks that the supplier record has a
base location and that `/api/supplierlocations/<supplierId>/true` is not empty. If
either is empty the widget never loads and our form stays, silently. If the API fails,
the script fails, the widget shows its own error, nothing renders within
`loadTimeoutMs`, or the widget breaks after it was ready (its form disappears or it
throws), our form comes back and one `console.warn` is logged. Our forms are always in
the page, visible without JavaScript.

**Kill switch.** Set `BOOKING_CONFIG.easyota.enabled` to `false` in
`assets/js/booking.js` to never load it.

**Production gate.** On `easyota.productionHosts` the widget also needs
`BOOKING_CONFIG.easyota.productionEnabled` set to `true`, on top of every check above.
It ships `false`: staging and preview hosts load the widget automatically, production
keeps our forms. Flip it only after a successful end-to-end test on staging:

1. A transfer search submits from the widget.
2. The redirect lands on `https://book.tot-wa.com/search/{id}`.
3. The pickup date and time on that page display correctly in Namibian time
   (the widget sends the chosen time with a `Z` suffix, so check it is not shifted).

**Vendored version.** EasyOTA Form Plugin 1.80, build `main.992a0d69` (see
`assets/vendor/easyota/VERSION`). 1.80 adds a per-child age select to the travelers
dropdown (driven by the supplier's `settings.minChildAge` and `settings.searchChildAge`),
drops the infants option, and adds a vendor rule that removes the border from focused
inputs, which `easyota-theme.css` overrides.

**Updating the vendor files.** Keep the plugin zip in `vendor-src/` (gitignored). Copy
only `build/static/js/main.<hash>.js` and `build/css/easyota-form-styles.css` into
`assets/vendor/easyota/`, delete the old bundle, update `easyota.script` in
`booking.js` and the `VERSION` file, then run `npm test`. Never copy
`easyota-form-plugin.php` or `plugin-update-checker/`: the PHP file contains a
hardcoded GitHub access token for EasyOTA's update checker. `npm test` starts with
`npm run test:secrets`, which fails if any tracked file contains a GitHub token prefix.
Never edit the vendor files: all styling lives in `assets/css/easyota-theme.css`, where
every selector is scoped to `#easyota-form-plugin-react`. Never commit the `.js.map`
source map: it contains EasyOTA's proprietary source (`*.js.map` and `vendor-src/` are
gitignored).

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
npm test                          # secret scan, then npm run test:ui
```

Checks every page, including the generated tour pages, at 390, 820 and 1440 wide: no
horizontal overflow, no serious or critical axe violations, every button leads somewhere,
the mobile drawer, header contrast, a 13px minimum text size and no placeholder text.
Third-party requests are blocked there, so the EasyOTA widget is always in its fallback
state.

`tests/easyota.spec.js` mocks `book.tot-wa.com/api` and runs the real vendored widget:
it mounts and fits at the three widths, the theme overrides admin colors, the dialog and
transfer-page slots work, the 1.80 child-age selects fit at 390 wide, focused fields
keep their border, and every fallback path (API error, empty locations, widget
error, widget vanishing after it was ready, kill switch) restores our form. Its axe
check fails only on issues outside the widget; issues inside it are attached to the
test result as `easyota-widget-axe.json`.
