// TOT WA: booking handoff. Every booking form on the site
// ([data-booking-form]) is validated here, then handed off to EasyOTA once
// it is configured, or to a WhatsApp / inquiry choice until then. The header
// "Book now" buttons ([data-open-booking]) open one global booking dialog.

const BOOKING_CONFIG = {
  easyotaUrl: null, // set to 'https://book.tot-wa.com/...' once EasyOTA sends the embed
  whatsappNumber: '264816008766',
  contactPage: 'contact.html',
};

const BOOKING_SERVICES = {
  'airport-transfer': 'Airport transfer',
  'private-transfer': 'Private transfer',
  tour: 'Tour or safari',
  'custom-tour': 'Custom tour',
  activity: 'Activity',
  'event-transfer': 'Event transfer',
  'vehicle-rental': 'Vehicle rental',
  other: 'Something else',
};

(function () {
  const { TotWa } = window;

  // ---- reading a form into a booking request ----
  const fieldValue = (field) => {
    if (field.type === 'checkbox') return field.checked ? 'yes' : '';
    if (field.tagName === 'SELECT') {
      const option = field.selectedOptions[0];
      return option && option.value ? (option.dataset.summary || option.textContent.trim()) : '';
    }
    return field.value.trim();
  };

  const resolveService = (form) => {
    const serviceField = form.querySelector('[data-field="service"]');
    if (serviceField && serviceField.value) return serviceField.value;
    const declared = form.dataset.service;
    if (declared === 'auto-transfer') {
      // Home and dialog transfer tabs: an airport pickup (or drop-off) is an
      // airport transfer, anything else is a private transfer.
      const endpoints = form.querySelectorAll('[data-field="from"], [data-field="to"]');
      const isAirport = [...endpoints].some((f) => {
        const opt = f.tagName === 'SELECT' ? f.selectedOptions[0] : null;
        return (opt && opt.dataset.airport !== undefined) || /airport|hkia|hosea kutako/i.test(f.value);
      });
      return isAirport ? 'airport-transfer' : 'private-transfer';
    }
    if (declared === 'auto-tour') {
      const route = form.querySelector('[data-field="route"]');
      return route && route.value === 'custom' ? 'custom-tour' : 'tour';
    }
    if (declared) return declared;
    return BOOKING_SERVICES[form.dataset.bookingForm] ? form.dataset.bookingForm : 'other';
  };

  const readRequest = (form, extra = {}) => {
    const service = extra.service || resolveService(form);
    const lines = [];
    const byField = {};
    form.querySelectorAll('[data-field]').forEach((field) => {
      if (field.disabled || field.closest('[hidden]') || field.dataset.field === 'service') return;
      const value = fieldValue(field);
      byField[field.dataset.field] = value;
      if (value && field.dataset.label) lines.push({ key: field.dataset.field, label: field.dataset.label, value });
    });
    Object.entries(extra.fields || {}).forEach(([key, { label, value }]) => {
      if (!value) return;
      byField[key] = value;
      lines.unshift({ key, label, value });
    });
    let route = byField.route || byField.activity || '';
    if (!route && (byField.from || byField.to || byField.country)) {
      route = [byField.from, byField.to || byField.country].filter(Boolean).join(' to ');
    }
    if (!route && byField.region) route = byField.region;
    return { service, lines, route, date: byField.date || '', pax: byField.pax || '' };
  };

  const summaryText = (request) => {
    const parts = [`Service: ${BOOKING_SERVICES[request.service] || 'Booking'}`];
    request.lines.forEach(({ label, value }) => parts.push(`${label}: ${value}`));
    return `Hi Tot Wa, I'd like to check availability. ${parts.map((p) => p.replace(/\.$/, '')).join('. ')}.`;
  };

  const whatsappUrl = (request) =>
    `https://wa.me/${BOOKING_CONFIG.whatsappNumber}?text=${encodeURIComponent(summaryText(request))}`;

  const inquiryUrl = (request) => {
    const params = new URLSearchParams();
    params.set('service', request.service);
    if (request.route) params.set('route', request.route.slice(0, 120));
    if (/^\d{4}-\d{2}-\d{2}$/.test(request.date)) params.set('date', request.date);
    if (/^\d+$/.test(request.pax)) params.set('pax', request.pax);
    // Details the inquiry form has no dedicated field for (time, flight,
    // child seat) travel along as a prefilled message.
    const covered = new Set(['from', 'to', 'country', 'route', 'activity', 'region', 'date', 'pax']);
    const notes = request.lines.filter((l) => !covered.has(l.key)).map((l) => `${l.label}: ${l.value}.`).join(' ');
    if (notes) params.set('notes', notes);
    return `${BOOKING_CONFIG.contactPage}?${params.toString()}`;
  };

  // ---- button busy state ----
  const setBusy = (button, busy) => {
    if (!button) return;
    if (busy) {
      button.setAttribute('aria-busy', 'true');
      if (!button.querySelector('.spinner')) button.insertAdjacentHTML('beforeend', TotWa.icons.spinner);
    } else {
      button.removeAttribute('aria-busy');
      const spinner = button.querySelector('.spinner');
      if (spinner) spinner.remove();
    }
  };

  // ---- handoff dialogs ----
  const handoffDialog = () => TotWa.createDialog({
    id: 'handoffDialog',
    className: 'dialog-sm',
    labelledBy: 'handoffTitle',
    html: `
      <div class="dialog-inner">
        <div class="dialog-head">
          <h2 id="handoffTitle">How would you like to continue?</h2>
          <button type="button" class="icon-btn" data-dialog-close aria-label="Close">${TotWa.icons.close}</button>
        </div>
        <p class="dialog-lede">Send us your trip details and we'll confirm availability with you directly.</p>
        <div class="handoff-options">
          <a class="handoff-option" data-handoff="whatsapp" target="_blank" rel="noopener" href="https://wa.me/${BOOKING_CONFIG.whatsappNumber}">
            <span class="handoff-icon">${TotWa.icons.whatsapp}</span>
            <span><strong>Continue on WhatsApp</strong><span>Opens a chat with your details filled in.</span></span>
          </a>
          <a class="handoff-option" data-handoff="inquiry" href="${BOOKING_CONFIG.contactPage}">
            <span class="handoff-icon">${TotWa.icons.mail}</span>
            <span><strong>Send an inquiry</strong><span>We reply within one business day.</span></span>
          </a>
        </div>
      </div>`,
  });

  const easyotaDialog = () => {
    const dialog = TotWa.createDialog({
      id: 'easyotaDialog',
      className: 'dialog-frame',
      labelledBy: 'easyotaTitle',
      html: `
        <div class="dialog-inner">
          <div class="dialog-head">
            <h2 id="easyotaTitle">Check availability</h2>
            <button type="button" class="icon-btn" data-dialog-close aria-label="Close">${TotWa.icons.close}</button>
          </div>
          <div class="frame-wrap">
            <div class="skeleton frame-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
            <iframe title="Tot Wa online booking"></iframe>
          </div>
        </div>`,
    });
    return dialog;
  };

  const handOff = (request, button) => {
    setBusy(button, true);
    if (BOOKING_CONFIG.easyotaUrl) {
      const dialog = easyotaDialog();
      const frame = dialog.querySelector('iframe');
      const skeleton = dialog.querySelector('.frame-skeleton');
      skeleton.hidden = false;
      frame.addEventListener('load', () => {
        skeleton.hidden = true;
        setBusy(button, false);
      }, { once: true });
      frame.src = BOOKING_CONFIG.easyotaUrl;
      dialog.addEventListener('totwa:closed', () => setBusy(button, false), { once: true });
      TotWa.openDialog(dialog, { returnFocus: button });
      return;
    }
    const dialog = handoffDialog();
    dialog.querySelector('[data-handoff="whatsapp"]').href = whatsappUrl(request);
    dialog.querySelector('[data-handoff="inquiry"]').href = inquiryUrl(request);
    dialog.addEventListener('totwa:closed', () => setBusy(button, false), { once: true });
    // A form inside the global booking dialog hands off from within it:
    // close that first so only one modal is ever open.
    const parentDialog = button && button.closest('dialog[open]');
    const returnFocus = parentDialog ? parentDialog._returnFocus : button;
    if (parentDialog) {
      parentDialog._returnFocus = null;
      parentDialog.close();
    }
    TotWa.openDialog(dialog, { returnFocus });
  };

  // ---- form wiring ----
  const validators = new WeakMap();
  const addValidator = (form, check) => {
    if (!validators.has(form)) validators.set(form, []);
    validators.get(form).push(check);
  };

  const bindForm = (form) => {
    if (form.dataset.bookingReady) return;
    form.dataset.bookingReady = 'true';
    form.noValidate = true;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = TotWa.validateFields(form, validators.get(form) || []);
      if (invalid.length) return;
      const button = e.submitter || form.querySelector('[type="submit"]');
      handOff(readRequest(form), button);
    });
  };

  // ---- global "Book now" dialog ----
  const routeOptions = () => Object.entries(typeof TOUR_PACKAGES !== 'undefined' ? TOUR_PACKAGES : {})
    .map(([key, pkg]) => `<option value="${key}">${TotWa.escapeHtml(pkg.name)}</option>`).join('');

  const BOOKING_DIALOG_TEMPLATE = () => `
    <div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="bookingTitle">Book now</h2>
        <button type="button" class="icon-btn" data-dialog-close aria-label="Close">${TotWa.icons.close}</button>
      </div>
      <div class="dialog-tabs" data-tabs aria-label="Booking type">
        <button type="button" class="tab-btn active" data-target="bd-transfer" data-tab="transfer">Transfer</button>
        <button type="button" class="tab-btn" data-target="bd-tour" data-tab="tour">Tour &amp; safari</button>
        <button type="button" class="tab-btn" data-target="bd-activity" data-tab="activity">Activity</button>
      </div>
      <form class="dialog-form" id="bd-transfer" data-booking-form="transfer" data-service="auto-transfer" novalidate>
        <div class="form-grid">
          <div class="field-group">
            <label for="bd-tf-from">Pickup</label>
            <select id="bd-tf-from" data-field="from" data-label="From">
              <option data-airport>Hosea Kutako Intl. (HKIA)</option>
              <option data-airport>Eros Airport</option>
              <option>Windhoek hotel or lodge</option>
              <option>Somewhere else</option>
            </select>
          </div>
          <div class="field-group">
            <label for="bd-tf-to">Drop-off</label>
            <input id="bd-tf-to" type="text" data-field="to" data-label="To" data-combobox="suburbs" autocomplete="off" required data-error="Tell us where you're going">
          </div>
          <div class="field-group">
            <label for="bd-tf-date">Date</label>
            <input id="bd-tf-date" type="date" data-field="date" data-label="Date" required data-error="Choose a travel date">
          </div>
          <div class="field-group">
            <label for="bd-tf-time">Pickup time</label>
            <input id="bd-tf-time" type="time" data-field="time" data-label="Time">
          </div>
          <div class="field-group">
            <label for="bd-tf-flight">Flight number (optional)</label>
            <input id="bd-tf-flight" type="text" data-field="flight" data-label="Flight" autocomplete="off" placeholder="e.g. WB 124">
          </div>
          <div class="field-group">
            <label for="bd-tf-pax">Passengers</label>
            <input id="bd-tf-pax" type="number" min="1" max="50" value="2" inputmode="numeric" data-field="pax" data-label="Passengers" required data-error="Enter at least 1 passenger" data-range-error="Enter at least 1 passenger">
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Check availability</button>
      </form>
      <form class="dialog-form" id="bd-tour" data-booking-form="tour" data-service="auto-tour" novalidate hidden>
        <div class="form-grid">
          <div class="field-group span-2">
            <label for="bd-tr-route">Route</label>
            <select id="bd-tr-route" data-field="route" data-label="Route" required data-error="Choose a route">
              <option value="">Choose a route</option>
              ${routeOptions()}
            </select>
          </div>
          <div class="field-group">
            <label for="bd-tr-date">Departure</label>
            <input id="bd-tr-date" type="date" data-field="date" data-label="Date" required data-error="Choose a departure date">
          </div>
          <div class="field-group">
            <label for="bd-tr-pax">Travelers</label>
            <input id="bd-tr-pax" type="number" min="1" max="50" value="2" inputmode="numeric" data-field="pax" data-label="Travelers" required data-error="Enter at least 1 traveler" data-range-error="Enter at least 1 traveler">
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Check availability</button>
      </form>
      <form class="dialog-form" id="bd-activity" data-booking-form="activity" data-service="activity" novalidate hidden>
        <div class="form-grid">
          <div class="field-group span-2">
            <label for="bd-ac-region">Region</label>
            <select id="bd-ac-region" data-field="region" data-label="Region" required data-error="Choose a region">
              <option value="">Choose a region</option>
              <option>Etosha</option>
              <option>Damaraland / Twyfelfontein</option>
              <option>Kunene / Kaokoland</option>
              <option>Sossusvlei / Namib</option>
            </select>
          </div>
          <div class="field-group">
            <label for="bd-ac-date">Date</label>
            <input id="bd-ac-date" type="date" data-field="date" data-label="Date" required data-error="Choose a date">
          </div>
          <div class="field-group">
            <label for="bd-ac-pax">People</label>
            <input id="bd-ac-pax" type="number" min="1" max="50" value="2" inputmode="numeric" data-field="pax" data-label="People" required data-error="Enter at least 1 person" data-range-error="Enter at least 1 person">
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Check availability</button>
      </form>
    </div>`;

  const bookingDialog = () => {
    let dialog = document.getElementById('bookingDialog');
    if (dialog) return dialog;
    dialog = TotWa.createDialog({ id: 'bookingDialog', labelledBy: 'bookingTitle', html: BOOKING_DIALOG_TEMPLATE() });
    TotWa.initTabs(dialog);
    TotWa.setDateMins(dialog);
    dialog.querySelectorAll('[data-booking-form]').forEach(bindForm);
    if (TotWa.enhanceCombos) TotWa.enhanceCombos(dialog);
    return dialog;
  };

  const openBooking = ({ tab, route, trigger } = {}) => {
    const dialog = bookingDialog();
    const tablist = dialog.querySelector('[data-tabs]');
    if (tab && tablist._selectTab) tablist._selectTab(tab);
    if (route) {
      const select = dialog.querySelector('#bd-tr-route');
      if (select) select.value = route;
    }
    TotWa.openDialog(dialog, { returnFocus: trigger });
    const panel = dialog.querySelector('.dialog-form:not([hidden])');
    const first = panel && panel.querySelector('input, select');
    if (first) first.focus();
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-booking]');
    if (!trigger) return;
    e.preventDefault();
    openBooking({ tab: trigger.dataset.openBooking || undefined, route: trigger.dataset.route, trigger });
  });

  document.querySelectorAll('[data-booking-form]').forEach(bindForm);
  TotWa.setDateMins();

  TotWa.booking = { handOff, readRequest, addValidator, bindForm, openBooking, summaryText, whatsappUrl, inquiryUrl, setBusy };
})();
