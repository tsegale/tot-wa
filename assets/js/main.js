// TOT WA: site-wide behaviour. Header, mobile drawer, nav menus, sticky
// action bar, route carousel, trust-bar count-up, tour and activity
// filters, and the contact inquiry form. Loaded last on every page.

const CONTACT_ENDPOINT = 'api/contact';

(function () {
  const { TotWa } = window;
  const desktopNav = window.matchMedia('(min-width: 1081px)');

  // ---------------------------------------------------------------- header
  const header = document.getElementById('siteHeader');
  const drawer = document.getElementById('navLinks');
  let drawerOpen = false;

  if (header) {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 40);
      const goingDown = y > lastY;
      const keepVisible = drawerOpen || header.contains(document.activeElement) || y < 200;
      if (keepVisible || !goingDown) header.classList.remove('is-hidden');
      else if (Math.abs(y - lastY) > 4) header.classList.add('is-hidden');
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
    onScroll();
  }

  // ---------------------------------------------------------------- mobile drawer
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const backdrop = document.getElementById('navBackdrop');

  const focusables = () => [...drawer.querySelectorAll('a[href], button:not([disabled]), input, select')]
    .filter((el) => el.offsetParent !== null);

  const setDrawer = (open, { restoreFocus = true } = {}) => {
    if (!drawer || drawerOpen === open) return;
    drawerOpen = open;
    drawer.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    TotWa.setOverlay('drawer', open);
    if (open) {
      header.classList.remove('is-hidden');
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add('visible'));
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      drawer.setAttribute('aria-label', 'Menu');
      menuClose.focus();
    } else {
      backdrop.classList.remove('visible');
      const hide = () => { if (!drawerOpen) backdrop.hidden = true; };
      if (TotWa.reducedMotion()) hide(); else setTimeout(hide, 280);
      drawer.removeAttribute('role');
      drawer.removeAttribute('aria-modal');
      drawer.removeAttribute('aria-label');
      if (restoreFocus) menuToggle.focus();
    }
  };

  if (drawer && menuToggle) {
    menuToggle.addEventListener('click', () => setDrawer(true));
    menuClose.addEventListener('click', () => setDrawer(false));
    backdrop.addEventListener('click', () => setDrawer(false));
    drawer.addEventListener('keydown', (e) => {
      if (!drawerOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrawer(false);
      } else if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    drawer.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && drawerOpen) setDrawer(false, { restoreFocus: !link.hasAttribute('data-open-booking') });
    });
    desktopNav.addEventListener('change', (e) => { if (e.matches) setDrawer(false, { restoreFocus: false }); });
  }

  // ---------------------------------------------------------------- nav disclosures
  const dropdowns = [...document.querySelectorAll('[data-disclosure]')];
  const setDropdown = (dd, open) => {
    dd.classList.toggle('open', open);
    dd.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', String(open));
    if (open) dd.classList.remove('closed-by-user');
  };
  dropdowns.forEach((dd) => {
    const toggle = dd.querySelector('.nav-dropdown-toggle');
    toggle.addEventListener('click', () => {
      const open = !dd.classList.contains('open');
      dropdowns.forEach((other) => { if (other !== dd) setDropdown(other, false); });
      setDropdown(dd, open);
      if (!open) dd.classList.add('closed-by-user');
    });
    dd.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && desktopNav.matches) setDropdown(dd, true);
    });
    dd.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && desktopNav.matches) {
        setDropdown(dd, false);
        dd.classList.remove('closed-by-user');
      }
    });
    dd.addEventListener('focusout', (e) => {
      if (desktopNav.matches && !dd.contains(e.relatedTarget)) {
        setDropdown(dd, false);
        dd.classList.remove('closed-by-user');
      }
    });
    dd.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const wasOpen = dd.classList.contains('open') || dd.matches(':focus-within');
      if (!wasOpen) return;
      e.stopPropagation();
      setDropdown(dd, false);
      dd.classList.add('closed-by-user');
      toggle.focus();
    });
  });
  document.addEventListener('click', (e) => {
    dropdowns.forEach((dd) => {
      if (!dd.contains(e.target) && dd.classList.contains('open')) setDropdown(dd, false);
    });
  });

  // ---------------------------------------------------------------- tabs, dates, year
  TotWa.initTabs();
  TotWa.setDateMins();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------------------------------------------------------------- sticky mobile action bar
  const actionBar = document.getElementById('actionBar');
  if (actionBar && 'IntersectionObserver' in window) {
    const hero = document.querySelector('.hero, .page-hero, .legal-hero');
    const blockers = new Set();
    let heroGone = !hero;
    const update = () => {
      const show = heroGone && blockers.size === 0;
      actionBar.hidden = !show;
      document.body.style.setProperty('--action-bar-h', show && !desktopNav.matches ? `${actionBar.offsetHeight}px` : '0px');
    };
    if (hero) {
      new IntersectionObserver(([entry]) => { heroGone = !entry.isIntersecting; update(); }).observe(hero);
    }
    const blockerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) blockers.add(entry.target); else blockers.delete(entry.target);
      });
      update();
    });
    document.querySelectorAll('.site-footer, main [data-booking-form]').forEach((el) => {
      if (!el.closest('dialog')) blockerObserver.observe(el);
    });
    desktopNav.addEventListener('change', update);
  }

  // ---------------------------------------------------------------- route carousel
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const status = carousel.querySelector('[data-carousel-status]');
    const items = [...track.children];
    const step = () => {
      const first = items[0];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    };
    const currentIndex = () => Math.min(items.length - 1, Math.round(track.scrollLeft / step()));
    const refresh = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      if (status) status.textContent = `${currentIndex() + 1} of ${items.length}`;
    };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: TotWa.reducedMotion() ? 'auto' : 'smooth' });
    if (prev) prev.addEventListener('click', () => go(-1));
    if (next) next.addEventListener('click', () => go(1));
    track.addEventListener('keydown', (e) => {
      if (e.target !== track) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { refresh(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', refresh);
    refresh();
  });

  // ---------------------------------------------------------------- trust-bar count-up
  const counters = [...document.querySelectorAll('[data-count]')]
    .filter((el) => Number.isInteger(Number(el.dataset.count)) && Number(el.dataset.count) <= 10);
  if (counters.length && 'IntersectionObserver' in window && !TotWa.reducedMotion()) {
    const bar = counters[0].closest('section') || counters[0];
    const rect = bar.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (!alreadyVisible) {
      counters.forEach((el) => { el.textContent = '0'; });
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / 600);
          const eased = 1 - (1 - t) ** 3;
          counters.forEach((el) => { el.textContent = String(Math.round(Number(el.dataset.count) * eased)); });
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { threshold: 0.4 });
      observer.observe(bar);
    }
  }

  // ---------------------------------------------------------------- tour listing filters
  const filterRoot = document.querySelector('[data-tour-filters]');
  if (filterRoot) {
    const cards = [...document.querySelectorAll('[data-direction]')];
    const count = document.getElementById('routeCount');
    const state = { direction: 'all', length: 'all' };
    const apply = () => {
      let shown = 0;
      cards.forEach((card) => {
        const dirOk = state.direction === 'all' || card.dataset.direction === state.direction;
        const lenOk = state.length === 'all' || card.dataset.length === state.length;
        card.hidden = !(dirOk && lenOk);
        if (!card.hidden) shown += 1;
      });
      count.textContent = `${shown} ${shown === 1 ? 'route' : 'routes'}`;
    };
    filterRoot.querySelectorAll('[data-filter-group]').forEach((group) => {
      group.querySelectorAll('button[data-value]').forEach((btn) => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('button[data-value]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
          state[group.dataset.filterGroup] = btn.dataset.value;
          apply();
        });
      });
    });
    apply();
  }

  // ---------------------------------------------------------------- activities: region filter + card handoff
  const activitySearch = document.querySelector('[data-booking-form="activity"]');
  const activityGrid = document.querySelector('[data-activity-grid]');
  if (activitySearch && activityGrid) {
    const region = activitySearch.querySelector('[data-field="region"]');
    const cards = [...activityGrid.querySelectorAll('[data-region]')];
    const count = document.getElementById('activityCount');
    const empty = document.getElementById('activityEmpty');
    const filter = () => {
      let shown = 0;
      cards.forEach((card) => {
        const match = !region.value || card.dataset.region === 'any' || card.dataset.region === region.value;
        card.hidden = !match;
        if (match && card.dataset.region !== 'any') shown += 1;
      });
      count.textContent = region.value
        ? `${shown} ${shown === 1 ? 'activity' : 'activities'} in ${region.value}`
        : `${shown} activities`;
      empty.hidden = shown > 0;
    };
    region.addEventListener('change', filter);
    filter();

    activityGrid.querySelectorAll('[data-activity]').forEach((button) => {
      button.addEventListener('click', () => {
        const request = TotWa.booking.readRequest(activitySearch, {
          service: 'activity',
          fields: { activity: { label: 'Activity', value: button.dataset.activity } },
        });
        TotWa.booking.handOff(request, button);
      });
    });
  }

  // ---------------------------------------------------------------- hero ambient video guard
  // The <video> markup in index.html is commented out until footage exists.
  // When it is enabled, this keeps it off for data-saver and reduced motion.
  const heroVideo = document.querySelector('.hero-media video');
  if (heroVideo) {
    const saveData = navigator.connection && navigator.connection.saveData;
    if (saveData || TotWa.reducedMotion()) {
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
      heroVideo.remove();
    }
  }

  // ---------------------------------------------------------------- contact: three-step inquiry
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const steps = [...contactForm.querySelectorAll('.form-step')];
    const progressText = document.getElementById('stepText');
    const progressBar = [...document.querySelectorAll('.steps-bar span')];
    const formNote = document.getElementById('formNote');
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const serviceValue = () => (contactForm.querySelector('input[name="service"]:checked') || {}).value || '';
    let current = 0;

    contactForm.classList.add('js-steps');
    document.getElementById('stepsProgress').hidden = false;
    contactForm.querySelectorAll('.step-nav, [data-step-nav="back"]').forEach((el) => { el.hidden = false; });

    const hours = typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.hours;
    if (hours) {
      document.getElementById('businessHoursText').textContent = hours;
      document.getElementById('businessHours').hidden = false;
    }

    const show = (index, focus = true) => {
      current = index;
      steps.forEach((step, i) => { step.hidden = i !== index; });
      progressText.textContent = `Step ${index + 1} of ${steps.length}`;
      progressBar.forEach((bar, i) => bar.classList.toggle('done', i <= index));
      if (focus) {
        const legend = steps[index].querySelector('legend');
        legend.tabIndex = -1;
        legend.focus();
      }
    };

    const validateStep = (index) => {
      const step = steps[index];
      if (index === 0) {
        const radios = step.querySelectorAll('input[name="service"]');
        const group = step.querySelector('.radio-cards');
        TotWa.clearFieldError(group);
        if (!serviceValue()) {
          TotWa.setFieldError(group, 'Choose what you need');
          radios[0].focus();
          return false;
        }
        return true;
      }
      if (index === 1 && serviceValue() === 'other') {
        step.querySelectorAll('[aria-invalid]').forEach((f) => TotWa.clearFieldError(f));
        return true;
      }
      return TotWa.validateFields(step).length === 0;
    };

    // Step 2 is only required for a trip; "Something else" can skip it.
    const syncStepTwo = () => {
      const optional = serviceValue() === 'other';
      steps[1].querySelectorAll('[data-trip-required]').forEach((f) => { f.required = !optional; });
      const skip = document.getElementById('skipStep');
      if (skip) skip.hidden = !optional;
    };
    contactForm.querySelectorAll('input[name="service"]').forEach((r) => r.addEventListener('change', () => {
      syncStepTwo();
      TotWa.clearFieldError(contactForm.querySelector('.radio-cards'));
    }));

    contactForm.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-step-nav]');
      if (!nav) return;
      const dir = nav.dataset.stepNav;
      if (dir === 'back') show(current - 1);
      else if (dir === 'skip') show(current + 1);
      else if (validateStep(current)) show(current + 1);
    });

    // Prefill from ?service=&route=&date=&pax=&notes= (booking handoff).
    const params = new URLSearchParams(window.location.search);
    const setIf = (name, value) => {
      const field = contactForm.elements[name];
      if (field && value && !field.value) field.value = value;
    };
    const service = params.get('service');
    if (service) {
      const radio = contactForm.querySelector(`input[name="service"][value="${CSS.escape(service)}"]`);
      if (radio) radio.checked = true;
    }
    setIf('route', params.get('route'));
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '')) setIf('date', params.get('date'));
    if (/^\d+$/.test(params.get('pax') || '')) contactForm.elements.pax.value = params.get('pax');
    setIf('message', params.get('notes'));
    syncStepTwo();

    // Start on the first incomplete step.
    let start = 0;
    if (serviceValue()) {
      start = 1;
      const step2 = steps[1];
      const step2Done = serviceValue() === 'other'
        || [...step2.querySelectorAll('[data-trip-required]')].every((f) => f.value.trim());
      if (step2Done) start = 2;
    }
    show(start, false);

    const setNote = (text, state) => {
      formNote.textContent = text;
      formNote.classList.remove('success', 'error');
      if (state) formNote.classList.add(state);
      formNote.hidden = false;
    };

    // No-JS submissions are redirected back here by the server.
    if (params.get('sent') === '1') setNote("Message sent. We'll get back to you within one business day.", 'success');
    if (params.get('error') === '1') setNote("Couldn't send your message. Please try again, or email info@tot-wa.com directly.", 'error');

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      for (let i = 0; i < steps.length; i += 1) {
        if (!validateStep(i)) { show(i, false); validateStep(i); return; }
      }
      submitBtn.disabled = true;
      TotWa.booking.setBusy(submitBtn, true);
      setNote('Sending…');

      const payload = Object.fromEntries(new FormData(contactForm).entries());
      try {
        const response = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.ok) {
          setNote("Message sent. We'll get back to you within one business day.", 'success');
          contactForm.reset();
          syncStepTwo();
          show(0, false);
        } else {
          setNote(result.error || "Couldn't send your message. Please try again, or email info@tot-wa.com directly.", 'error');
        }
      } catch (err) {
        setNote("Couldn't reach the server. Please try again, or email info@tot-wa.com directly.", 'error');
      } finally {
        submitBtn.disabled = false;
        TotWa.booking.setBusy(submitBtn, false);
      }
    });
  }
})();
