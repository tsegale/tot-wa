// TOT WA: booking handoff. Every booking form on the site
// ([data-booking-form]) is validated here, then handed off to a WhatsApp /
// inquiry choice. The header "Book now" buttons ([data-open-booking]) open
// one global booking dialog.

const BOOKING_CONFIG = {
  easyota: {
    enabled: true,
    host: 'book.tot-wa.com',
    productionHosts: ['tot-wa.com', 'www.tot-wa.com'],
    script: 'assets/vendor/easyota/main.03c19ad4.js',
    styles: 'assets/vendor/easyota/easyota-form-styles.css',
    loadTimeoutMs: 8000,
  },
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

  const handOff = (request, button) => {
    setBusy(button, true);
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

  // ---- EasyOTA widget ----
  // The vendored bundle renders into the first #easyota-form-plugin-react it
  // finds, once, when the script is evaluated. So there is one mount and one
  // attempt per page load. A slot ([data-easyota-slot]) names the element it
  // replaces (data-easyota-fallback): our own form, which stays in charge
  // until the widget is ready and comes back whenever the widget fails.
  const EASYOTA_MOUNT_ID = 'easyota-form-plugin-react';
  const EASYOTA_WARNING = 'EasyOTA widget unavailable, using fallback form';
  const easyota = { status: 'idle' }; // idle, checking, loading, ready, skipped, failed

  const easyotaApi = (path) => `https://${BOOKING_CONFIG.easyota.host}/api/${path}`;

  const fetchJson = async (url) => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  };

  // True only when the supplier can take a transfer search. The pickup list
  // comes from supplierlocations, and the widget's Transfer form also reads
  // the supplier's own base location (locations[0] of the supplier record)
  // the moment a pickup is chosen, throwing if it is missing. Both must exist.
  const easyotaSupplierReady = async () => {
    const supplier = await fetchJson(easyotaApi(`suppliers/${BOOKING_CONFIG.easyota.host}`));
    const supplierId = supplier && supplier.cosmetics && supplier.cosmetics.supplierId;
    if (!supplierId || !Array.isArray(supplier.locations) || !supplier.locations.length) return false;
    const pickups = await fetchJson(easyotaApi(`supplierlocations/${encodeURIComponent(supplierId)}/true`));
    return Array.isArray(pickups) && pickups.length > 0;
  };

  // The widget picks its supplier from the page hostname (book.<hostname>),
  // and on localhost it falls back to EasyOTA's demo supplier. Anywhere other
  // than tot-wa.com (GitHub Pages previews, local servers) we pin it to our
  // supplier with ?fixedHost=. The bundle reads that once, while it is being
  // evaluated, so this has to run before the script is injected.
  const pinEasyotaHost = () => {
    const { host, productionHosts } = BOOKING_CONFIG.easyota;
    if (productionHosts.includes(window.location.hostname)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('fixedHost')) return;
    params.set('fixedHost', host);
    history.replaceState(history.state, '', `${window.location.pathname}?${params}${window.location.hash}`);
  };

  const addStylesheet = (href) => {
    if (document.querySelector(`link[data-easyota-css="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.easyotaCss = href;
    document.head.appendChild(link);
  };

  const firstField = (root) => root && [...root.querySelectorAll('input:not([type="hidden"]), select, textarea')]
    .find((field) => !field.disabled && !field.closest('[hidden]'));

  const talkUrl = () => `https://wa.me/${BOOKING_CONFIG.whatsappNumber}?text=${encodeURIComponent("Hi Tot Wa, I'd like to talk through a transfer.")}`;

  const loadEasyOTA = async (slot) => {
    const config = BOOKING_CONFIG.easyota;
    if (!config.enabled || !slot || easyota.status !== 'idle' || document.getElementById(EASYOTA_MOUNT_ID)) return false;
    const fallback = document.getElementById(slot.dataset.easyotaFallback);
    if (!fallback) return false;
    easyota.status = 'checking';

    // Someone who starts typing into our form while the supplier check runs
    // keeps it: the widget never swaps in under them.
    let engaged = false;
    const markEngaged = () => { engaged = true; };
    fallback.addEventListener('input', markEngaged);
    let usable = false;
    let checkError = null;
    try {
      usable = await easyotaSupplierReady();
    } catch (error) {
      checkError = error;
    }
    fallback.removeEventListener('input', markEngaged);
    if (checkError) {
      easyota.status = 'failed';
      console.warn(EASYOTA_WARNING, checkError);
      return false;
    }
    // An empty supplier is the expected state until EasyOTA finishes setup:
    // keep our form without a warning.
    if (!usable || engaged) {
      easyota.status = 'skipped';
      return false;
    }

    easyota.status = 'loading';
    pinEasyotaHost();
    addStylesheet(config.styles);
    slot.innerHTML = `
      <div class="skeleton easyota-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
      <div id="${EASYOTA_MOUNT_ID}" hidden></div>
      <p class="easyota-talk">Prefer to talk it through? <a class="text-link" href="${talkUrl()}" target="_blank" rel="noopener">Message us on WhatsApp</a></p>`;
    const skeleton = slot.querySelector('.easyota-skeleton');
    const mount = document.getElementById(EASYOTA_MOUNT_ID);
    const hadFocus = fallback.contains(document.activeElement);
    slot.tabIndex = -1;
    slot.hidden = false;
    fallback.hidden = true;
    if (hadFocus) slot.focus({ preventScroll: true });

    const scriptName = config.script.split('/').pop();
    let observer = null;
    let timer = null;
    let onError = null;

    const stopWatching = () => {
      if (observer) observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener('error', onError);
    };

    return new Promise((resolve) => {
      const fail = (reason) => {
        if (easyota.status === 'failed') return;
        const focusWasInside = slot.contains(document.activeElement);
        easyota.status = 'failed';
        stopWatching();
        slot.replaceChildren();
        slot.hidden = true;
        slot.removeAttribute('tabindex');
        fallback.hidden = false;
        if (focusWasInside) {
          const field = firstField(fallback);
          if (field) field.focus();
        }
        console.warn(EASYOTA_WARNING, reason);
        document.dispatchEvent(new CustomEvent('totwa:easyota', { detail: { ready: false } }));
        resolve(false);
      };

      const ready = () => {
        easyota.status = 'ready';
        clearTimeout(timer);
        skeleton.remove();
        mount.hidden = false;
        if (slot.contains(document.activeElement)) {
          const field = firstField(mount);
          if (field) field.focus();
        }
        document.dispatchEvent(new CustomEvent('totwa:easyota', { detail: { ready: true } }));
        resolve(true);
      };

      // Before ready: wait for the form, or the widget's own error message.
      // After ready: the bundle has no error boundary, so a render error
      // unmounts the whole form. Losing .form-wrap means it broke.
      observer = new MutationObserver(() => {
        if (easyota.status === 'loading') {
          if (mount.querySelector('.loading.error')) fail(new Error('widget could not load the supplier'));
          else if (mount.querySelector('.easyota-form-plugin .form-wrap')) ready();
        } else if (easyota.status === 'ready' && !mount.querySelector('.form-wrap')) {
          fail(new Error('widget form disappeared after it was ready'));
        }
      });
      observer.observe(mount, { childList: true, subtree: true });

      // Errors thrown from the widget's event handlers leave the form on
      // screen but broken (for example choosing a pickup with no supplier
      // location), so any uncaught error from the bundle also restores ours.
      onError = (event) => {
        const stack = (event.error && event.error.stack) || '';
        if ((event.filename || '').includes(scriptName) || stack.includes(scriptName)) {
          fail(event.error || new Error(event.message));
        }
      };
      window.addEventListener('error', onError);

      timer = setTimeout(() => {
        if (easyota.status === 'loading') fail(new Error(`widget not ready after ${config.loadTimeoutMs}ms`));
      }, config.loadTimeoutMs);

      const script = document.createElement('script');
      script.src = config.script;
      script.async = true;
      script.addEventListener('error', () => fail(new Error(`${config.script} failed to load`)));
      document.body.appendChild(script);
    });
  };

  // Pages with their own slot load the widget without waiting for the
  // booking dialog: eagerly above the fold (home), or as the booking
  // section nears the viewport (transfer pages).
  const autoLoadEasyOTA = () => {
    const slot = document.querySelector('[data-easyota-slot][data-easyota-load]');
    if (!slot || !BOOKING_CONFIG.easyota.enabled) return;
    const target = slot.closest('section') || slot.parentElement;
    if (slot.dataset.easyotaLoad !== 'visible' || !('IntersectionObserver' in window) || !target) {
      loadEasyOTA(slot);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      loadEasyOTA(slot);
    }, { rootMargin: '600px 0px' });
    io.observe(target);
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
        <button type="button" class="tab-btn active" data-target="bd-transfer-panel" data-tab="transfer">Transfer</button>
        <button type="button" class="tab-btn" data-target="bd-tour" data-tab="tour">Tour &amp; safari</button>
        <button type="button" class="tab-btn" data-target="bd-activity" data-tab="activity">Activity</button>
      </div>
      <div class="dialog-panel" id="bd-transfer-panel">
      <div class="easyota-slot" data-easyota-slot data-easyota-fallback="bd-transfer" hidden></div>
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
      </div>
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
    const first = firstField(dialog.querySelector('[role="tabpanel"]:not([hidden])'));
    if (first) first.focus();
    // Pages that mount the widget in their own booking area keep it there;
    // everywhere else the dialog hosts it, loaded on first open.
    if (!document.querySelector('[data-easyota-load]')) loadEasyOTA(dialog.querySelector('[data-easyota-slot]'));
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-booking]');
    if (!trigger) return;
    e.preventDefault();
    openBooking({ tab: trigger.dataset.openBooking || undefined, route: trigger.dataset.route, trigger });
  });

  document.querySelectorAll('[data-booking-form]').forEach(bindForm);
  TotWa.setDateMins();
  TotWa.loadEasyOTA = loadEasyOTA;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoLoadEasyOTA);
  else autoLoadEasyOTA();

  TotWa.booking = { handOff, readRequest, addValidator, bindForm, openBooking, summaryText, whatsappUrl, inquiryUrl, setBusy };
})();
