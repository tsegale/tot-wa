// Shared page assembly for the static site. Every page carries marker
// comments (<!-- @head -->...<!-- /@head -->, @header, @footer, @scripts and
// a few content blocks); applyBlocks() re-renders what sits between them.
// This is what keeps the header and footer identical on every page.
// Used by scripts/build-pages.js and scripts/build-tours.js.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOUR_PACKAGES = require(path.join(ROOT, 'assets/js/tours-data.js'));
const TRANSFER_DATA = require(path.join(ROOT, 'assets/js/transfers-data.js'));
const SITE_CONFIG = require(path.join(ROOT, 'assets/js/site-config.js'));

const BRAND = SITE_CONFIG.name;
const ORIGIN = SITE_CONFIG.origin;

// Per-page settings. `nav` marks the current section in the header; `sub`
// marks the current item inside a dropdown. `ogImage` is the source image
// the 1200x630 social card is cropped from (scripts/build-images.js).
const PAGES = [
  {
    file: 'index.html', nav: 'home', header: 'on-dark',
    title: `${BRAND} | Namibia, until where?`,
    description: 'Airport transfers, private transfers and guided safaris across Namibia, all run by one Windhoek-based operator.',
    ogImage: 'assets/images/home/hero.webp',
  },
  {
    file: 'airport-transfers.html', nav: 'transfers', sub: 'airport-transfers.html', header: 'on-dark',
    title: `Airport transfers | ${BRAND}`,
    description: 'Airport transfers to and from Hosea Kutako International and Eros Airport, Windhoek. Met at arrivals, every time.',
    ogImage: 'assets/images/airport-transfers/hero.webp',
  },
  {
    file: 'private-transfers.html', nav: 'transfers', sub: 'private-transfers.html', header: 'on-dark',
    title: `Private transfers | ${BRAND}`,
    description: 'Private transfers across Namibia, city to lodge, and cross-border to Botswana, South Africa and Zambia.',
    ogImage: 'assets/images/private-transfers/hero.webp',
  },
  {
    file: 'tours-safaris.html', nav: 'tours', sub: 'tours-safaris.html', header: 'on-dark',
    title: `Tours & safaris | ${BRAND}`,
    description: 'Five ready-to-book Namibia safari routes and a fully custom one, from Sossusvlei to Etosha to Twyfelfontein.',
    ogImage: 'assets/images/tours-safaris/hero.webp',
  },
  {
    file: 'activities.html', nav: 'activities', header: 'on-dark',
    title: `Activities | ${BRAND}`,
    description: 'Half-day and full-day Namibia activities, from Etosha game drives to Twyfelfontein rock art and a Himba Living Museum visit.',
    ogImage: 'assets/images/activities/hero.webp',
  },
  {
    file: 'about.html', nav: 'about', header: 'on-dark',
    title: `About us | ${BRAND}`,
    description: "Tot Wa started as a Windhoek airport transfer company and grew into a full Namibian tour operator. Here's how, and what 'tot wa' actually means.",
    ogImage: 'assets/images/about/hero.webp',
  },
  {
    file: 'contact.html', nav: 'contact', header: 'on-dark',
    title: `Contact us | ${BRAND}`,
    description: `Get in touch with ${BRAND}. Phone, WhatsApp, email and our Windhoek address.`,
    ogImage: 'assets/images/contact/hero.webp',
  },
  {
    file: 'terms.html', nav: 'terms', header: 'on-light', actionBar: false,
    title: `Terms and conditions | ${BRAND}`,
    description: 'Tot Wa Tours and Transfers cc terms and conditions: definitions, payment, cancellation, liability and booking policies.',
    ogImage: 'assets/images/home/hero.webp',
  },
];

const tourPackages = () => Object.entries(TOUR_PACKAGES).map(([key, pkg]) => ({ key, ...pkg }));
const tourHref = (pkg) => (pkg.href ? pkg.href : `tour-${pkg.slug}.html`);

const esc = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pageUrl = (file) => (file === 'index.html' ? `${ORIGIN}/` : `${ORIGIN}/${file}`);
// og cards are named after their source path, e.g. og/airport-transfers-hero.jpg
function ogName(src) {
  const rel = path.relative('assets/images', src).replace(/\\/g, '/');
  return rel.replace(/\.[a-z]+$/, '').replace(/\//g, '-');
}

// ---------------------------------------------------------------- icons
const ICON_PATHS = {
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  caret: '<path d="M6 9l6 6 6-6"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  phone: '<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  whatsapp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20z"/><path d="M9.2 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c.5 1 1.4 1.9 2.4 2.4l.6-.5c.2-.1.4-.2.6-.1l1.5.6c.3.1.4.3.4.5v.5c0 .3-.1.6-.6.8-1.8.8-6.6-3.2-6.7-6.7z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
  pin: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  plane: '<path d="M10.5 13.5L4 11l1.5-1.5 7 .5 3.5-3.5c.8-.8 2.2-.8 3 0s.8 2.2 0 3L15.5 13l.5 7-1.5 1.5-2.5-6.5-3 3v2L7.5 21 6 18l-3-1.5L4.5 15h2z"/>',
  road: '<path d="M8 3L4 21M16 3l4 18"/><path d="M12 4v2.5M12 10.5v3M12 17.5V20"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M7 7l10 10M17 7L7 17"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  seat: '<path d="M7 3h5a2 2 0 0 1 2 2v7H7z"/><path d="M5 12h11a2 2 0 0 1 2 2v2H5z"/><path d="M7 16v5M16 16v5"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 14v7M10 12H3.5M14 12h6.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M14.8 14.8c2.6.3 4.2 2.2 4.2 5.2"/>',
  bag: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V4.5h6V7M9 11v5M15 11v5"/>',
  pickup: '<path d="M3 16V11l2-4h7v9"/><path d="M12 11h9v5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 11h7"/>',
  suv: '<path d="M3 16v-4l2.5-5h11l3.5 5v4"/><path d="M3 12h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
  bus: '<rect x="3" y="5" width="18" height="11" rx="2"/><path d="M3 11h18M8 5v6M14 5v6"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  meal: '<path d="M6 3v8M4 3v5a2 2 0 0 0 4 0V3M6 11v10"/><path d="M17 21V3c-2 1.5-3 4-3 7h3"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-8v5"/><circle cx="6.5" cy="11" r="1.5"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
};

const icon = (name, className = 'icon') =>
  `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`;

// ---------------------------------------------------------------- @head
function renderHead(page) {
  const url = pageUrl(page.file);
  const og = `${ORIGIN}/assets/images/og/${ogName(page.ogImage)}.jpg`;
  return `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="assets/fonts/AbelPro-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/AbelPro-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="icon" type="image/png" href="assets/images/tot-wa-icon.png">
`;
}

// ---------------------------------------------------------------- @header
// Flat, single-colour route/contour motif: the site's recurring signature
// graphic. No gradients.
const SPRITE = `
<svg class="sprite" aria-hidden="true" focusable="false">
  <symbol id="routeMotif" viewBox="0 0 800 500">
    <g fill="none" stroke="currentColor" stroke-width="1.4">
      <path d="M-20,120 Q200,80 400,130 T820,110"/>
      <path d="M-20,230 Q220,190 420,240 T820,220" stroke-opacity="0.7"/>
      <path d="M-20,340 Q240,300 440,345 T820,330" stroke-opacity="0.45"/>
      <path d="M40,420 C180,300 320,300 400,180 S560,60 720,90" stroke-dasharray="2 10" stroke-width="1.6"/>
      <circle cx="40" cy="420" r="4" fill="currentColor" stroke="none"/>
      <circle cx="400" cy="180" r="4" fill="currentColor" stroke="none"/>
      <circle cx="720" cy="90" r="5" fill="currentColor" stroke="none"/>
    </g>
  </symbol>
</svg>`;

const current = (page, match) => (page.sub === match || page.file === match ? ' aria-current="page"' : '');

function renderMegaItems(page) {
  return tourPackages().map((pkg) => {
    const href = tourHref(pkg);
    const thumb = pkg.image
      ? `<img class="mega-thumb" src="${pkg.image.src}" alt="" width="64" height="80" sizes="64px" loading="lazy" decoding="async">`
      : `<span class="mega-thumb mega-thumb-custom"><svg class="route-motif-inline" aria-hidden="true" focusable="false"><use href="#routeMotif"/></svg></span>`;
    const meta = pkg.duration
      ? `<span class="mega-meta">${pkg.duration} days<span class="mega-price" data-tour="${pkg.key}" data-price-format="compact"></span></span>`
      : '<span class="mega-meta">Your dates, your pace</span>';
    return `
            <li><a class="mega-item" href="${href}"${current(page, href)}>
              ${thumb}
              <span class="mega-text"><span class="mega-name">${esc(pkg.name)}</span>${meta}</span>
            </a></li>`;
  }).join('');
}

function renderHeader(page) {
  const navLink = (href, label, key) => {
    const isCurrent = page.nav === key;
    return `<li><a href="${href}"${isCurrent ? ' class="active" aria-current="page"' : ''}>${label}</a></li>`;
  };
  const sectionActive = (key) => (page.nav === key ? ' active' : '');
  return `
<a class="skip-link" href="#main">Skip to content</a>
${SPRITE}
<header id="siteHeader" class="site-header ${page.header}">
  <a href="index.html" class="logo" aria-label="${esc(BRAND)}, home">
    <img src="assets/images/tot-wa-icon.png" alt="" class="logo-icon" width="439" height="568">
    <span class="logo-text"><span class="logo-tot">TOT</span><span class="logo-wa">WA</span></span>
  </a>
  <nav class="site-nav" aria-label="Main">
    <div class="nav-drawer" id="navLinks">
      <div class="drawer-head">
        <button type="button" class="icon-btn drawer-close" id="menuClose" aria-label="Close menu">${icon('close')}</button>
      </div>
      <ul class="nav-list">
        ${navLink('index.html', 'Home', 'home')}
        <li class="nav-dropdown" data-disclosure>
          <button type="button" class="nav-dropdown-toggle${sectionActive('transfers')}" aria-expanded="false" aria-controls="transfersMenu">
            Transfers ${icon('caret', 'icon nav-caret')}
          </button>
          <div class="nav-dropdown-menu" id="transfersMenu">
            <ul>
              <li><a href="airport-transfers.html"${current(page, 'airport-transfers.html')}>Airport transfers</a></li>
              <li><a href="private-transfers.html"${current(page, 'private-transfers.html')}>Private transfers</a></li>
              <li><a href="contact.html?service=event-transfer">Event transfers</a></li>
              <li><a href="contact.html?service=vehicle-rental">Vehicle rental</a></li>
            </ul>
          </div>
        </li>
        <li class="nav-dropdown nav-mega" data-disclosure>
          <button type="button" class="nav-dropdown-toggle${sectionActive('tours')}" aria-expanded="false" aria-controls="toursMenu">
            Tours &amp; safaris ${icon('caret', 'icon nav-caret')}
          </button>
          <div class="nav-dropdown-menu mega-panel" id="toursMenu">
            <ul class="mega-list">${renderMegaItems(page)}
            </ul>
            <a class="mega-all" href="tours-safaris.html"${current(page, 'tours-safaris.html')}>All tours &amp; safaris</a>
          </div>
        </li>
        ${navLink('activities.html', 'Activities', 'activities')}
        ${navLink('about.html', 'About', 'about')}
        ${navLink('contact.html', 'Contact', 'contact')}
      </ul>
      <a href="contact.html" class="btn btn-primary nav-cta" data-open-booking>Book now</a>
      <div class="drawer-contact">
        <a href="tel:${SITE_CONFIG.phone}">${icon('phone')}<span>Call</span></a>
        <a href="https://wa.me/${SITE_CONFIG.whatsappNumber}" target="_blank" rel="noopener">${icon('whatsapp')}<span>WhatsApp</span></a>
        <a href="mailto:${SITE_CONFIG.email}">${icon('mail')}<span>Email</span></a>
      </div>
    </div>
  </nav>
  <div class="nav-backdrop" id="navBackdrop" hidden></div>
  <button type="button" class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks">
    <span></span><span></span><span></span>
  </button>
</header>
`;
}

// ---------------------------------------------------------------- @footer
function renderFooter(page) {
  const addr = SITE_CONFIG.physicalAddress;
  const actionBar = page.actionBar === false ? '' : `
<div class="action-bar" id="actionBar" hidden>
  <a href="https://wa.me/${SITE_CONFIG.whatsappNumber}" class="btn btn-secondary" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp</a>
  <a href="contact.html" class="btn btn-primary" data-open-booking>Book now</a>
</div>`;
  return `
<footer class="site-footer">
  <div class="footer-grid">
    <div class="footer-brand">
      <div class="footer-logo">
        <img src="assets/images/tot-wa-icon.png" alt="" class="footer-logo-icon" width="439" height="568">
        <span class="logo-text"><span class="logo-tot">TOT</span><span class="logo-wa">WA</span></span>
        <span class="footer-tagline">Tours &amp; Transfers</span>
      </div>
      <p>Namibian-run transfers and tours. Windhoek-based, country-wide.</p>
      <p class="footer-trust">${icon('shield')}<span>NTB registered (${SITE_CONFIG.ntbRegistration}). Every passenger insured.</span></p>
    </div>
    <div class="footer-col">
      <h2>Explore</h2>
      <ul>
        <li><a href="airport-transfers.html">Airport transfers</a></li>
        <li><a href="private-transfers.html">Private transfers</a></li>
        <li><a href="tours-safaris.html">Tours &amp; safaris</a></li>
        <li><a href="activities.html">Activities</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h2>Company</h2>
      <ul>
        <li><a href="about.html">About us</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="terms.html">Terms &amp; conditions</a></li>
        <li><a href="terms.html#credits">Photo credits</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h2>Get in touch</h2>
      <ul>
        <li><a href="tel:${SITE_CONFIG.phone}">${SITE_CONFIG.phoneDisplay}</a></li>
        <li><a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a></li>
        <li><a href="https://wa.me/${SITE_CONFIG.whatsappNumber}" target="_blank" rel="noopener">WhatsApp us</a></li>
      </ul>
      <address>${addr.street}, ${addr.suburb}, ${addr.city}<br>${SITE_CONFIG.postalAddress}</address>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="year">${new Date().getFullYear()}</span> ${esc(BRAND)}</span>
    <span>Windhoek, Namibia</span>
  </div>
</footer>${actionBar}
`;
}

// ---------------------------------------------------------------- @scripts
const CORE_SCRIPTS = [
  'ui.js', 'site-config.js', 'tours-data.js', 'tours-pricing.js',
  'transfers-data.js', 'transfers.js', 'booking.js', 'main.js',
];
function renderScripts() {
  return `\n${CORE_SCRIPTS.map((s) => `<script src="assets/js/${s}"></script>`).join('\n')}\n`;
}

// ---------------------------------------------------------------- blocks
const renderers = {
  head: renderHead,
  header: renderHeader,
  footer: renderFooter,
  scripts: renderScripts,
};

function registerBlock(name, fn) {
  renderers[name] = fn;
}

// Replaces <!-- @name attr="x" -->...<!-- /@name --> with a fresh render.
function applyBlocks(html, page) {
  return html.replace(/<!-- @([\w-]+)((?: [\w-]+="[^"]*")*) -->[\s\S]*?<!-- \/@\1 -->/g, (match, name, rawAttrs) => {
    const render = renderers[name];
    if (!render) throw new Error(`Unknown block @${name} in ${page.file}`);
    const attrs = {};
    rawAttrs.replace(/([\w-]+)="([^"]*)"/g, (m, k, v) => { attrs[k] = v; });
    return `<!-- @${name}${rawAttrs} -->${render(page, attrs)}<!-- /@${name} -->`;
  });
}

module.exports = {
  ROOT, PAGES, BRAND, ORIGIN, TOUR_PACKAGES, TRANSFER_DATA, SITE_CONFIG,
  tourPackages, tourHref, esc, icon, pageUrl, ogName,
  renderHead, renderHeader, renderFooter, renderScripts, applyBlocks, registerBlock,
};
