// TOT WA: renders package prices from tours-data.js into any element with a
// data-tour attribute, so a price or priceConfirmed change in the data file
// is the only edit ever needed. Formats (data-price-format):
//   card     "From N$44,000 pp sharing, N$6,290 per day" (default)
//   compact  "from N$44,000" (mega-menu)
//   glance   amount with the per-day figure on its own line (tour pages)
//   bar      amount only, for the tour page's mobile bar
// The provisional-price footnote ([data-price-footnote]) shows once per
// page, only while any package still has priceConfirmed:false.

function formatPriceNAD(amount) {
  const wholeNumber = Math.round(amount);
  return 'N$' + wholeNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Per-day guide figure, rounded to the nearest N$10.
function perDayNAD(pkg) {
  if (!pkg.price || !pkg.duration) return null;
  return Math.round(pkg.price / pkg.duration / 10) * 10;
}

function renderTourPrices(root = document) {
  root.querySelectorAll('[data-tour]').forEach((priceEl) => {
    const pkg = TOUR_PACKAGES[priceEl.dataset.tour];
    if (!pkg || pkg.price == null) {
      if (priceEl.dataset.priceFallback) {
        priceEl.textContent = priceEl.dataset.priceFallback;
      } else {
        priceEl.hidden = true;
      }
      return;
    }
    const format = priceEl.dataset.priceFormat || 'card';
    const prefix = pkg.priceConfirmed ? '' : 'From ';
    const perDay = perDayNAD(pkg);
    if (format === 'compact') {
      priceEl.textContent = `${prefix.toLowerCase()}${formatPriceNAD(pkg.price)}`;
      return;
    }
    const amount = `${prefix}${formatPriceNAD(pkg.price)} pp${format === 'card' ? ' sharing' : ''}`;
    let html = `<span class="price-amount">${amount}</span>`;
    if (perDay && format === 'card') html += `<span class="price-perday">, ${formatPriceNAD(perDay)} per day</span>`;
    if (perDay && format === 'glance') html += `<small class="price-perday">${formatPriceNAD(perDay)} per day</small>`;
    priceEl.innerHTML = html;
  });

  const anyProvisional = Object.values(TOUR_PACKAGES).some((pkg) => pkg.price != null && !pkg.priceConfirmed);
  root.querySelectorAll('[data-price-footnote]').forEach((note) => { note.hidden = !anyProvisional; });
}

renderTourPrices();
