// TOT WA: tour detail page. Booking panel (traveler stepper, live total,
// departure-day check), mobile bottom sheet, gallery lightbox, and the
// itinerary accordion driving the route map.

(function () {
  const { TotWa } = window;
  const key = document.body.dataset.tourKey;
  const pkg = typeof TOUR_PACKAGES !== 'undefined' ? TOUR_PACKAGES[key] : null;
  if (!pkg) return;

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const listJoin = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`);

  // ---------------------------------------------------------------- booking panel
  const form = document.getElementById('tourForm');
  const paxInput = document.getElementById('tp-pax');
  const paxOut = document.getElementById('tp-pax-out');
  const total = document.getElementById('tourTotal');
  const totalNote = document.getElementById('tourTotalNote');
  const whatsapp = document.getElementById('tourWhatsapp');
  const maxPax = Number(form.dataset.maxPax) || 12;
  let pax = Number(paxInput.value) || 2;

  const totalAmount = () => {
    if (pkg.price == null) return null;
    let amount = pkg.price * pax;
    if (pax === 1 && pkg.singleSupplement) amount += pkg.singleSupplement;
    return amount;
  };

  const renderTotal = (animate) => {
    const amount = totalAmount();
    form.querySelector('.total-label').textContent = `Total for ${pax} ${pax === 1 ? 'traveler' : 'travelers'}`;
    if (amount == null) {
      total.textContent = 'Quote on request';
      totalNote.textContent = '';
      return;
    }
    const text = `${pkg.priceConfirmed ? '' : 'From '}${formatPriceNAD(amount)}`;
    const notes = [];
    if (!pkg.priceConfirmed) notes.push('Guide price');
    if (pax === 1 && pkg.singleSupplement) notes.push(`includes ${formatPriceNAD(pkg.singleSupplement)} single supplement`);
    const apply = () => {
      total.textContent = text;
      totalNote.textContent = notes.join(', ');
      total.classList.remove('swap');
    };
    if (animate && !TotWa.reducedMotion()) {
      total.classList.add('swap');
      setTimeout(apply, 160);
    } else {
      apply();
    }
  };

  const updateWhatsapp = () => {
    const request = TotWa.booking.readRequest(form);
    whatsapp.href = TotWa.booking.whatsappUrl(request);
  };

  const setPax = (value, animate = true) => {
    pax = Math.max(1, Math.min(maxPax, value));
    paxInput.value = String(pax);
    paxOut.textContent = String(pax);
    form.querySelector('[data-step="-1"]').disabled = pax <= 1;
    form.querySelector('[data-step="1"]').disabled = pax >= maxPax;
    renderTotal(animate);
    updateWhatsapp();
  };

  form.querySelectorAll('[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => setPax(pax + Number(btn.dataset.step)));
  });
  form.addEventListener('change', updateWhatsapp);
  setPax(pax, false);

  // Departure-day check, only when the route has fixed departure weekdays.
  if (Array.isArray(pkg.departureWeekdays) && pkg.departureWeekdays.length) {
    TotWa.booking.addValidator(form, (container) => {
      const date = container.querySelector('#tp-date');
      if (!date.value) return null;
      const [y, m, d] = date.value.split('-').map(Number);
      const weekday = new Date(y, m - 1, d).getDay();
      if (pkg.departureWeekdays.includes(weekday)) return null;
      const days = pkg.departureWeekdays.map((n) => WEEKDAYS[n]);
      return {
        field: date,
        message: `This route departs on ${listJoin(days.map((n) => `${n}s`))}. Choose a ${listJoin(days)}.`,
      };
    });
  }

  // ---------------------------------------------------------------- mobile bottom sheet
  const sheet = document.getElementById('tourSheet');
  const sheetBody = document.getElementById('sheetBody');
  const panel = document.getElementById('bookingPanel');
  const openSheet = document.getElementById('openSheet');
  const panelHome = form.parentElement;
  const panelAnchor = form.nextSibling;

  TotWa.initDialog(sheet);
  openSheet.addEventListener('click', () => {
    sheetBody.appendChild(form);
    TotWa.openDialog(sheet, { returnFocus: openSheet });
  });
  sheet.addEventListener('close', () => {
    sheet.style.removeProperty('--sheet-drag');
    panelHome.insertBefore(form, panelAnchor);
  });

  // Drag down to dismiss: past 120px, or a fast downward flick.
  const handle = document.getElementById('sheetHandle');
  let dragStart = null;
  handle.addEventListener('pointerdown', (e) => {
    dragStart = { y: e.clientY, t: performance.now() };
    handle.setPointerCapture(e.pointerId);
    sheet.classList.add('dragging');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    const dy = Math.max(0, e.clientY - dragStart.y);
    sheet.style.setProperty('--sheet-drag', `${dy}px`);
  });
  const endDrag = (e) => {
    if (!dragStart) return;
    const dy = Math.max(0, e.clientY - dragStart.y);
    const velocity = dy / Math.max(1, performance.now() - dragStart.t);
    dragStart = null;
    sheet.classList.remove('dragging');
    if (dy > 120 || velocity > 0.6) sheet.close();
    else sheet.style.setProperty('--sheet-drag', '0px');
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  // Keep the panel's form in place if the viewport grows past the sheet breakpoint.
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => {
    if (e.matches && sheet.open) sheet.close();
  });
  if (panel) panel.hidden = false;

  // ---------------------------------------------------------------- gallery lightbox
  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const images = JSON.parse(gallery.dataset.gallery);
    const lightbox = TotWa.createDialog({
      id: 'lightbox',
      className: 'lightbox surface-dark',
      labelledBy: 'lightboxCounter',
      html: `
        <div class="dialog-inner">
          <div class="dialog-head">
            <p class="lightbox-counter" id="lightboxCounter" aria-live="polite"></p>
            <button type="button" class="icon-btn" data-dialog-close aria-label="Close">${TotWa.icons.close}</button>
          </div>
          <div class="lightbox-stage">
            <img alt="">
            <span class="photo-credit" hidden></span>
            ${images.length > 1 ? `
            <button type="button" class="carousel-btn lightbox-nav prev" aria-label="Previous photo"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
            <button type="button" class="carousel-btn lightbox-nav next" aria-label="Next photo"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>` : ''}
          </div>
        </div>`,
    });
    const img = lightbox.querySelector('.lightbox-stage img');
    const credit = lightbox.querySelector('.lightbox-stage .photo-credit');
    const counter = lightbox.querySelector('#lightboxCounter');
    let index = 0;
    const show = (i) => {
      index = (i + images.length) % images.length;
      const item = images[index];
      img.src = item.src;
      img.alt = item.alt;
      counter.textContent = `Photo ${index + 1} of ${images.length}`;
      credit.hidden = !item.credit;
      if (item.credit) {
        credit.innerHTML = `Photo: <a href="${TotWa.escapeHtml(item.credit.url)}" target="_blank" rel="noopener">${TotWa.escapeHtml(item.credit.author)}</a>, ${TotWa.escapeHtml(item.credit.license)}`;
      }
    };
    gallery.querySelectorAll('[data-gallery-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        show(Number(btn.dataset.galleryIndex));
        TotWa.openDialog(lightbox, { returnFocus: btn });
      });
    });
    const prev = lightbox.querySelector('.prev');
    const next = lightbox.querySelector('.next');
    if (prev) prev.addEventListener('click', () => show(index - 1));
    if (next) next.addEventListener('click', () => show(index + 1));
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    // Swipe with pointer events.
    const stage = lightbox.querySelector('.lightbox-stage');
    let swipeX = null;
    stage.addEventListener('pointerdown', (e) => { if (!e.target.closest('button, a')) swipeX = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (swipeX == null) return;
      const dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 50 && images.length > 1) show(index + (dx < 0 ? 1 : -1));
    });
  }

  // ---------------------------------------------------------------- itinerary drives the map
  const mapEl = document.querySelector('[data-route-map]');
  const progress = mapEl && mapEl.querySelector('.map-progress');
  const days = [...document.querySelectorAll('.itinerary details')];
  if (progress && days.length) {
    const pts = progress.getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));
    const segLengths = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const totalLength = segLengths.reduce((a, b) => a + b, 0);
    progress.style.strokeDasharray = `${totalLength}`;
    progress.style.strokeDashoffset = `${totalLength}`;
    const stops = [...mapEl.querySelectorAll('.map-stop')];
    const focusStop = (stopIndex) => {
      const drawn = segLengths.slice(0, stopIndex).reduce((a, b) => a + b, 0);
      progress.style.strokeDashoffset = `${totalLength - drawn}`;
      stops.forEach((g) => {
        const indexes = g.dataset.stopIndexes.split(' ').map(Number);
        g.classList.toggle('active', indexes.includes(stopIndex));
      });
    };
    days.forEach((d) => {
      d.addEventListener('toggle', () => {
        if (d.open && d.dataset.stopIndex !== '') focusStop(Number(d.dataset.stopIndex));
      });
    });
    const firstOpen = days.find((d) => d.open && d.dataset.stopIndex !== '');
    if (firstOpen) focusStop(Number(firstOpen.dataset.stopIndex));
  }
})();
