// TOT WA: shared UI primitives used by booking.js, main.js and the page
// scripts: modal dialogs, tabs, inline field errors, date limits, icons.
// Loaded first on every page. Everything hangs off one global, TotWa.

(function () {
  const TotWa = (window.TotWa = window.TotWa || {});

  TotWa.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Inline SVG icons, drawn with currentColor. Kept here so JS-rendered
  // markup (dialogs, fleet cards, spinners) stays consistent with the
  // static sprite in the page chrome.
  const svg = (body, viewBox = '0 0 24 24') =>
    `<svg class="icon" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  TotWa.icons = {
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    whatsapp: svg('<path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20z"/><path d="M9.2 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c.5 1 1.4 1.9 2.4 2.4l.6-.5c.2-.1.4-.2.6-.1l1.5.6c.3.1.4.3.4.5v.5c0 .3-.1.6-.6.8-1.8.8-6.6-3.2-6.7-6.7z"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>'),
    phone: svg('<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>'),
    spinner: '<svg class="spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  };

  const pad = (n) => String(n).padStart(2, '0');
  TotWa.todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  TotWa.setDateMins = (root = document) => {
    const today = TotWa.todayISO();
    root.querySelectorAll('input[type="date"]').forEach((input) => { input.min = today; });
  };

  TotWa.escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- overlay bookkeeping: any open dialog or drawer sets html.has-overlay,
  // which the sticky action bar and the auto-hiding header both read ----
  const openOverlays = new Set();
  TotWa.setOverlay = (key, isOpen) => {
    if (isOpen) openOverlays.add(key); else openOverlays.delete(key);
    document.documentElement.classList.toggle('has-overlay', openOverlays.size > 0);
    document.body.classList.toggle('scroll-locked', openOverlays.size > 0);
    document.dispatchEvent(new CustomEvent('totwa:overlay', { detail: { open: openOverlays.size > 0 } }));
  };

  // ---- modal dialogs (native <dialog>) ----
  // Native showModal gives us the focus trap, inert background and Escape.
  // This adds backdrop-click close, scroll lock and focus return.
  TotWa.initDialog = (dialog) => {
    if (dialog.dataset.ready) return dialog;
    dialog.dataset.ready = 'true';
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.querySelectorAll('[data-dialog-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('close', () => {
      TotWa.setOverlay(dialog.id || 'dialog', false);
      const returnTo = dialog._returnFocus;
      dialog._returnFocus = null;
      if (returnTo && document.contains(returnTo)) returnTo.focus();
      dialog.dispatchEvent(new CustomEvent('totwa:closed'));
    });
    return dialog;
  };

  TotWa.openDialog = (dialog, { returnFocus } = {}) => {
    TotWa.initDialog(dialog);
    dialog._returnFocus = returnFocus || document.activeElement;
    if (!dialog.open) dialog.showModal();
    TotWa.setOverlay(dialog.id || 'dialog', true);
    return dialog;
  };

  TotWa.createDialog = ({ id, className = '', labelledBy, html }) => {
    let dialog = document.getElementById(id);
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = `dialog ${className}`.trim();
    if (labelledBy) dialog.setAttribute('aria-labelledby', labelledBy);
    dialog.innerHTML = html;
    document.body.appendChild(dialog);
    return TotWa.initDialog(dialog);
  };

  // ---- tabs: .ticket-tabs buttons with data-target switch between panels.
  // Upgraded to the ARIA tabs pattern with roving tabindex and arrow keys. ----
  TotWa.initTabs = (root = document) => {
    root.querySelectorAll('[data-tabs]').forEach((tablist) => {
      if (tablist.dataset.ready) return;
      tablist.dataset.ready = 'true';
      const tabs = [...tablist.querySelectorAll('[data-target]')];
      tablist.setAttribute('role', 'tablist');
      const select = (tab, focus) => {
        tabs.forEach((t) => {
          const active = t === tab;
          const panel = document.getElementById(t.dataset.target);
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', String(active));
          t.tabIndex = active ? 0 : -1;
          if (panel) {
            panel.classList.toggle('active', active);
            panel.hidden = !active;
          }
        });
        if (focus) tab.focus();
        tablist.dispatchEvent(new CustomEvent('totwa:tab', { detail: { tab } }));
      };
      tabs.forEach((tab, i) => {
        const panel = document.getElementById(tab.dataset.target);
        if (!tab.id) tab.id = `${tab.dataset.target}-tab`;
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', tab.dataset.target);
        if (panel) {
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tab.id);
        }
        tab.addEventListener('click', () => select(tab, false));
        tab.addEventListener('keydown', (e) => {
          const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            select(tabs[e.key === 'Home' ? 0 : tabs.length - 1], true);
          } else if (step) {
            e.preventDefault();
            select(tabs[(i + step + tabs.length) % tabs.length], true);
          }
        });
      });
      select(tabs.find((t) => t.classList.contains('active')) || tabs[0], false);
      tablist._selectTab = (name) => {
        const tab = tabs.find((t) => t.dataset.tab === name || t.dataset.target === name);
        if (tab) select(tab, false);
      };
    });
  };

  // ---- inline field errors, linked with aria-describedby ----
  const describedBy = (el) => (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  TotWa.setFieldError = (field, message) => {
    const errorId = `${field.id}-error`;
    let error = document.getElementById(errorId);
    if (!error) {
      error = document.createElement('p');
      error.className = 'field-error';
      error.id = errorId;
      const host = field.closest('.field-group, .form-group, .stepper-group') || field.parentElement;
      host.appendChild(error);
    }
    error.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    const ids = describedBy(field);
    if (!ids.includes(errorId)) field.setAttribute('aria-describedby', [...ids, errorId].join(' '));
  };
  TotWa.clearFieldError = (field) => {
    const errorId = `${field.id}-error`;
    const error = document.getElementById(errorId);
    if (error) error.remove();
    field.removeAttribute('aria-invalid');
    const ids = describedBy(field).filter((id) => id !== errorId);
    if (ids.length) field.setAttribute('aria-describedby', ids.join(' '));
    else field.removeAttribute('aria-describedby');
  };
  // Clear a field's error as soon as the user edits it.
  document.addEventListener('input', (e) => {
    if (e.target.matches && e.target.matches('[aria-invalid="true"]')) TotWa.clearFieldError(e.target);
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('[aria-invalid="true"]')) TotWa.clearFieldError(e.target);
  });

  // Validates required fields inside a container. Each required field
  // carries its own data-error message. Returns the invalid fields, first
  // one focused.
  TotWa.validateFields = (container, extraChecks = []) => {
    const invalid = [];
    container.querySelectorAll('input, select, textarea').forEach((field) => {
      if (field.disabled || field.closest('[hidden]')) return;
      TotWa.clearFieldError(field);
      const value = field.type === 'checkbox' ? field.checked : field.value.trim();
      let message = null;
      if (field.required && !value) {
        message = field.dataset.error || 'Fill in this field';
      } else if (field.type === 'number' && value !== '') {
        const n = Number(value);
        const min = field.min !== '' ? Number(field.min) : null;
        const max = field.max !== '' ? Number(field.max) : null;
        if (!Number.isInteger(n) || (min !== null && n < min) || (max !== null && n > max)) {
          message = field.dataset.rangeError || `Enter a number from ${field.min || 1}${field.max ? ` to ${field.max}` : ''}`;
        }
      } else if (field.type === 'date' && value && field.min && value < field.min) {
        message = 'Choose a date from today onwards';
      } else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        message = 'Enter a valid email address';
      }
      if (message) {
        TotWa.setFieldError(field, message);
        invalid.push(field);
      }
    });
    extraChecks.forEach((check) => {
      const result = check(container);
      if (result && !invalid.includes(result.field)) {
        TotWa.setFieldError(result.field, result.message);
        invalid.push(result.field);
      }
    });
    if (invalid.length) {
      const first = [...container.querySelectorAll('[aria-invalid="true"]')][0] || invalid[0];
      first.focus();
    }
    return invalid;
  };
})();
