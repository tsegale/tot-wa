// Generated content blocks. Each renderer is registered by name; a page
// opts in with <!-- @name -->...<!-- /@name --> markers and build-pages.js
// (or build-tours.js) fills them from the data files.

const site = require('./site');
const { preloadLinks } = require('./images');

const { esc, icon, tourPackages, tourHref, TRANSFER_DATA, SITE_CONFIG, BRAND, ORIGIN } = site;

const DIRECTION_LABEL = { south: 'Southbound', north: 'Northbound', loop: 'Full loop', custom: 'Custom' };

function photoCredit(image, { linked }) {
  if (!image || !image.credit) return '';
  const { author, license, url } = image.credit;
  const name = linked ? `<a href="${url}" target="_blank" rel="noopener">${esc(author)}</a>` : esc(author);
  return `<span class="photo-credit">Photo: ${name}, ${esc(license)}</span>`;
}

// ---- tour <option>s for route selects ----
site.registerBlock('route-options', () => `\n${tourPackages()
  .map((pkg) => `              <option value="${pkg.key}">${esc(pkg.name)}</option>`).join('\n')}\n              `);

// ---- route card (home carousel, related routes on tour pages) ----
function routeCard(pkg, { sizes }) {
  const custom = !pkg.image;
  const media = custom
    ? '<svg class="route-motif" aria-hidden="true" focusable="false"><use href="#routeMotif"/></svg>'
    : `<img src="${pkg.image.src}" alt="" sizes="${sizes}" loading="lazy" decoding="async">${photoCredit(pkg.image, { linked: false })}`;
  const chip = pkg.duration ? `${pkg.duration} days` : 'Custom';
  const routeLine = custom ? 'Your dates, your pace, your stops.' : esc(pkg.route);
  const price = custom
    ? '<p class="route-price">Quote on request</p>'
    : `<p class="route-price" data-tour="${pkg.key}"></p>`;
  return `
        <li><a class="route-card${custom ? ' route-card-custom' : ''}" href="${tourHref(pkg)}">
          <div class="route-card-media">
            ${media}
            <span class="chip chip-dark">${chip}</span>
            <div class="route-card-overlay"><h3>${esc(pkg.name)}</h3><p>${routeLine}</p></div>
          </div>
          ${price}
        </a></li>`;
}

site.registerBlock('route-cards', (page, attrs) => {
  const exclude = attrs.exclude || '';
  const sizes = attrs.sizes || '(max-width: 640px) 85vw, (max-width: 1080px) 42vw, 30vw';
  return `${tourPackages().filter((p) => p.key !== exclude).map((p) => routeCard(p, { sizes })).join('')}\n      `;
});

// ---- tours listing package cards ----
function packageCard(pkg) {
  const custom = !pkg.image;
  const length = pkg.duration ? String(pkg.duration) : 'custom';
  const shown = pkg.highlights.slice(0, 3);
  const more = pkg.highlights.length - shown.length;
  const chips = [...shown.map((h) => `<li class="chip">${esc(h)}</li>`), more > 0 ? `<li class="chip">+${more}</li>` : '']
    .join('');
  const media = custom
    ? '<svg class="route-motif" aria-hidden="true" focusable="false"><use href="#routeMotif"/></svg>'
    : `<img src="${pkg.image.src}" alt="${esc(pkg.image.alt)}" sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw" loading="lazy" decoding="async">${photoCredit(pkg.image, { linked: false })}`;
  const price = custom
    ? '<p class="package-price">Quote on request</p>'
    : `<p class="package-price" data-tour="${pkg.key}"></p>`;
  const route = custom
    ? "Tell us your dates, your pace and what you actually want to see. We'll draft a route around it, using the same stops or a different mix entirely."
    : esc(pkg.route);
  return `
    <article class="package-card card-hover${custom ? ' custom surface-dark' : ''}" data-direction="${pkg.direction}" data-length="${length}">
      <div class="photo-slot">${media}</div>
      <span class="chip chip-dark">${pkg.duration ? `${pkg.duration} days` : 'Custom'}</span>
      <div class="package-body">
        <h3><a class="card-link" href="${tourHref(pkg)}">${esc(pkg.name)}</a></h3>
        <p class="package-route"><span class="visually-hidden">${DIRECTION_LABEL[pkg.direction]}. </span>${route}</p>
        <ul class="chip-list" aria-label="Highlights">${chips}</ul>
        ${price}
      </div>
    </article>`;
}

site.registerBlock('package-grid', () => `${tourPackages().map(packageCard).join('')}\n  `);

// ---- fleet cards (transfer pages) ----
const FLEET_ICON = { '4x4 Double Cab': 'pickup', '4x4 SUV': 'suv', Minibus: 'bus' };
const FLEET_PHOTO = {
  '4x4 SUV': { src: 'assets/images/about/vehicle-rental-suv.jpg', alt: 'Tot Wa 4x4 SUV' },
};
site.registerBlock('fleet', () => `${TRANSFER_DATA.fleet.map((v) => {
  const photo = FLEET_PHOTO[v.type];
  const media = photo
    ? `<div class="photo-slot"><img src="${photo.src}" alt="${esc(photo.alt)}" sizes="(max-width: 860px) 100vw, 30vw" loading="lazy" decoding="async"></div>`
    : `<div class="fleet-icon">${icon(FLEET_ICON[v.type] || 'suv')}</div>`;
  const specs = [
    v.seats != null ? `<span>${icon('users')}${v.seats} seats</span>` : '',
    v.bags != null ? `<span>${icon('bag')}${v.bags} bags</span>` : '',
  ].join('');
  return `
    <article class="fleet-card">
      ${media}
      <div class="fleet-body">
        <h3>${esc(v.type)}</h3>
        ${specs ? `<p class="fleet-specs">${specs}</p>` : ''}
      </div>
    </article>`;
}).join('')}\n  `);

// ---- hero image preload (art-directed) ----
site.registerBlock('hero-preload', (page, attrs) => `\n${preloadLinks(attrs.src)}\n`);

// ---- JSON-LD: the business, homepage only ----
site.registerBlock('jsonld-org', () => {
  const a = SITE_CONFIG.physicalAddress;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: BRAND,
    url: `${ORIGIN}/`,
    logo: `${ORIGIN}/assets/images/tot-wa-icon.png`,
    image: `${ORIGIN}/assets/images/og/home-hero.jpg`,
    telephone: SITE_CONFIG.phone,
    email: SITE_CONFIG.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.street,
      addressLocality: `${a.suburb}, ${a.city}`,
      postalCode: a.postalCode,
      addressCountry: a.country,
    },
  };
  return `\n<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>\n`;
});

module.exports = { routeCard, packageCard, photoCredit, DIRECTION_LABEL };
