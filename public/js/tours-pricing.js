// TOT WA: renders package pricing from js/tours-data.js into any element
// carrying a data-tour attribute. Centralizing the render here means a price
// or priceConfirmed change in tours-data.js is the only edit ever needed,
// the "From" prefix and confirmation note appear or drop on their own.

function formatPriceNAD(amount) {
  const wholeNumber = Math.round(amount);
  return 'N$' + wholeNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

document.querySelectorAll('[data-tour]').forEach((priceEl) => {
  const pkg = TOUR_PACKAGES[priceEl.dataset.tour];
  if (!pkg || pkg.price == null) {
    priceEl.hidden = true;
    return;
  }

  const prefix = pkg.priceConfirmed ? '' : 'From ';
  let html = `<span class="price-amount">${prefix}${formatPriceNAD(pkg.price)}<span class="price-unit"> pp sharing</span></span>`;
  if (!pkg.priceConfirmed) {
    html += '<span class="price-note">Pricing subject to final confirmation</span>';
  }
  priceEl.innerHTML = html;
});
