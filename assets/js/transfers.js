// TOT WA: transfer helpers. Suburb typeahead (ARIA 1.2 combobox) with an
// instant fare line, the airport fares table, and the private-transfer
// flight-number toggle. Reads TRANSFER_DATA from transfers-data.js.

(function () {
  const { TotWa } = window;
  if (typeof TRANSFER_DATA === 'undefined') return;

  const suburbs = TRANSFER_DATA.windhoekSuburbs;
  const aliases = TRANSFER_DATA.suburbAliases || {};
  const AIRPORT_RE = /airport|hkia|hosea kutako/i;

  const canonicalSuburb = (text) => {
    const needle = text.trim().toLowerCase();
    if (!needle) return null;
    const direct = suburbs.find((s) => s.toLowerCase() === needle);
    if (direct) return direct;
    const alias = Object.keys(aliases).find((a) => a.toLowerCase() === needle);
    return alias ? aliases[alias] : null;
  };

  const matches = (text) => {
    const needle = text.trim().toLowerCase();
    if (!needle) return [];
    const pool = [...suburbs, ...Object.keys(aliases)];
    const starts = pool.filter((s) => s.toLowerCase().startsWith(needle));
    const contains = pool.filter((s) => !s.toLowerCase().startsWith(needle) && s.toLowerCase().includes(needle));
    const seen = new Set();
    return [...starts, ...contains]
      .map((s) => aliases[s] || s)
      .filter((s) => (seen.has(s) ? false : seen.add(s)))
      .slice(0, 8);
  };

  // Which airport does this transfer touch? Reads the paired airport field.
  const airportFor = (input) => {
    const form = input.closest('form');
    const source = input.dataset.airportField
      ? document.getElementById(input.dataset.airportField)
      : form && form.querySelector('[data-field="from"]');
    if (!source || source === input) return null;
    const option = source.tagName === 'SELECT' ? source.selectedOptions[0] : null;
    if (option && option.dataset.airport !== undefined) {
      return option.dataset.airport || (/eros/i.test(option.textContent) ? 'eros' : 'hkia');
    }
    return null;
  };

  const fareText = (input) => {
    const airport = airportFor(input);
    const link = '<a href="terms.html#definitions">What counts as Windhoek?</a>';
    if (!airport) return '';
    const value = input.value.trim();
    if (!value) return link;
    const suburb = canonicalSuburb(value);
    if (suburb) {
      const fare = TRANSFER_DATA.fares.windhoekAirport[airport];
      const priced = fare != null
        ? `<strong>Windhoek airport transfer, ${formatNAD(fare)} per vehicle.</strong>`
        : '<strong>Windhoek airport transfer.</strong> Fixed fare, confirmed when you book.';
      return `${priced} ${link}`;
    }
    if (value.length < 3) return link;
    return `Outside Windhoek suburbs, this is an outbound transfer. We'll quote it for you. ${link}`;
  };

  function formatNAD(amount) {
    return typeof formatPriceNAD === 'function' ? formatPriceNAD(amount) : `N$${amount}`;
  }

  let comboCount = 0;
  const enhance = (input) => {
    if (input.dataset.comboReady) return;
    input.dataset.comboReady = 'true';
    comboCount += 1;
    const listId = `${input.id || `combo${comboCount}`}-list`;
    const group = input.closest('.field-group');
    group.classList.add('combo-field');

    const list = document.createElement('ul');
    list.id = listId;
    list.className = 'combo-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Windhoek suburbs');
    list.hidden = true;
    input.insertAdjacentElement('afterend', list);

    const fare = document.createElement('p');
    fare.className = 'fare-line';
    fare.id = `${input.id}-fare`;
    fare.setAttribute('aria-live', 'polite');
    list.insertAdjacentElement('afterend', fare);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', listId);
    input.setAttribute('autocomplete', 'off');
    const described = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    input.setAttribute('aria-describedby', [...described, fare.id].join(' '));

    let active = -1;
    let options = [];

    const updateFare = () => {
      const html = fareText(input);
      fare.innerHTML = html;
      fare.hidden = !html;
    };

    const close = () => {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };

    const setActive = (index) => {
      active = index;
      [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
      if (index >= 0) {
        const li = list.children[index];
        input.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    };

    const choose = (value) => {
      input.value = value;
      close();
      updateFare();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const open = () => {
      options = matches(input.value);
      if (!options.length) { close(); return; }
      const needle = input.value.trim().toLowerCase();
      list.innerHTML = options.map((s, i) => {
        const at = s.toLowerCase().indexOf(needle);
        const label = at >= 0
          ? `${TotWa.escapeHtml(s.slice(0, at))}<mark>${TotWa.escapeHtml(s.slice(at, at + needle.length))}</mark>${TotWa.escapeHtml(s.slice(at + needle.length))}`
          : TotWa.escapeHtml(s);
        return `<li role="option" id="${listId}-${i}" aria-selected="false">${label}</li>`;
      }).join('');
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      active = -1;
    };

    input.addEventListener('input', () => { open(); updateFare(); });
    input.addEventListener('keydown', (e) => {
      const isOpen = !list.hidden;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) open();
        if (options.length) setActive((active + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) open();
        if (options.length) setActive(active <= 0 ? options.length - 1 : active - 1);
      } else if (e.key === 'Enter' && isOpen && active >= 0) {
        e.preventDefault();
        choose(options[active]);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    });
    input.addEventListener('blur', () => { setTimeout(close, 120); updateFare(); });
    list.addEventListener('pointerdown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => {
      const li = e.target.closest('li[role="option"]');
      if (li) choose(options[[...list.children].indexOf(li)]);
    });

    const form = input.closest('form');
    if (form) form.addEventListener('change', (e) => { if (e.target !== input) updateFare(); });
    updateFare();
  };

  TotWa.enhanceCombos = (root = document) => {
    root.querySelectorAll('input[data-combobox="suburbs"]').forEach(enhance);
  };
  TotWa.enhanceCombos();

  // ---- airport fares table: shown only once at least one fare exists ----
  const fareSection = document.getElementById('fares');
  if (fareSection) {
    const fares = TRANSFER_DATA.fares.windhoekAirport;
    const rows = TRANSFER_DATA.airports.filter((a) => fares[a.id] != null);
    if (rows.length) {
      fareSection.querySelector('tbody').innerHTML = rows.map((a) =>
        `<tr><td>${TotWa.escapeHtml(a.name)} to any Windhoek suburb</td><td>${formatNAD(fares[a.id])}</td></tr>`).join('');
      fareSection.hidden = false;
    }
  }

  // ---- private transfers: flight number only when an end is an airport ----
  document.querySelectorAll('[data-flight-toggle]').forEach((group) => {
    const form = group.closest('form');
    const watched = [...form.querySelectorAll('[data-airport-watch]')];
    const sync = () => {
      const touchesAirport = watched.some((f) => AIRPORT_RE.test(f.value));
      group.hidden = !touchesAirport;
      const input = group.querySelector('input');
      if (!touchesAirport && input) input.value = '';
    };
    watched.forEach((f) => f.addEventListener('input', sync));
    sync();
  });
})();
