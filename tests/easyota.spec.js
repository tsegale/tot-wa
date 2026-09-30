// EasyOTA widget: loader, fallback and theming. book.tot-wa.com is mocked
// with page.route, so these run without the live API. The widget bundle
// itself is the real vendored file.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const API = 'https://book.tot-wa.com/api/';
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1440, height: 900 },
];
const WIDGET = '#easyota-form-plugin-react';
const WIDGET_FORM = `${WIDGET} .easyota-form-plugin .form-wrap`;
// The line under every widget that sends one-way trips to our own form.
const ONE_WAY = '.easyota-slot a[href="private-transfers.html#book"]';

const LOCATION = {
  id: 'sl-eros',
  name: 'Eros Airport',
  location: { id: 'loc-eros', name: 'Eros Airport' },
};

const SECOND_LOCATION = {
  id: 'sl-hkia',
  name: 'Hosea Kutako International Airport',
  location: { id: 'loc-hkia', name: 'Hosea Kutako International Airport' },
};

// The smallest supplier record the widget renders a Transfer form from.
const supplier = ({ locations = [LOCATION] } = {}) => ({
  cosmetics: { supplierId: 'supplier-test', baseColour: '#131741', widgetHeaderColour: '#131741', linkForeColour: null },
  tabs: [{
    id: 'tab-transfer',
    tabName: 'Airport Transfers',
    showWidget: true,
    tabOrder: '0',
    productType: { id: 'product-transfer', productName: 'Transfer' },
  }],
  productTypes: [],
  locations,
  // 1.80 shape: children get an age select from minChildAge to
  // searchChildAge; there is no infants option.
  settings: {
    defaultPickupLocation: null,
    showResidentOptions: false,
    allowChildren: true,
    minChildAge: 0,
    searchChildAge: 12,
    maxChildAge: 12,
  },
});

// Routes every third-party request: the EasyOTA API goes to `api`, fonts
// load, everything else (Elfsight, maps) is blocked as in ui.spec.js.
// Returns a log of the EasyOTA API paths requested.
async function mockEasyota(page, api) {
  const calls = [];
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(API)) {
      const path = url.slice(API.length);
      calls.push(path);
      return api(route, path, calls);
    }
    if (url.startsWith('http://localhost') || /fonts\.(googleapis|gstatic)\.com/.test(url)) return route.continue();
    return route.abort();
  });
  return calls;
}

const healthyApi = (route, path) => {
  if (path.startsWith('suppliers/')) return route.fulfill({ json: supplier() });
  if (path.startsWith('supplierlocations/')) return route.fulfill({ json: [LOCATION] });
  return route.fulfill({ status: 404, json: {} });
};

const loadTimeout = (page) => page.evaluate(() => BOOKING_CONFIG.easyota.loadTimeoutMs);

test.describe('EasyOTA widget: supplier available', () => {
  for (const viewport of VIEWPORTS) {
    test(`home @ ${viewport.width}: widget replaces the transfer form without overflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const calls = await mockEasyota(page, healthyApi);
      await page.goto('/index.html?ref=test#book');

      await expect(page.locator(WIDGET_FORM)).toBeVisible();
      await expect(page.locator('#home-transfer')).toBeHidden();
      await expect(page.locator('.easyota-skeleton')).toHaveCount(0);
      await expect(page.locator('.easyota-talk a[href^="https://wa.me/"]')).toHaveAttribute('href', /^https:\/\/wa\.me\/264816008766\?text=/);
      await expect(page.locator(ONE_WAY)).toBeVisible();

      // Off tot-wa.com the widget is pinned to our supplier, keeping other
      // params and the hash; the bundle then fetches book.tot-wa.com itself.
      expect(page.url()).toMatch(/\/index\.html\?ref=test&fixedHost=book\.tot-wa\.com#book$/);
      expect(calls.filter((c) => c === 'suppliers/book.tot-wa.com').length).toBeGreaterThanOrEqual(2);

      // Tour tab still shows our own form.
      await page.locator('#home-tour-tab').click();
      await expect(page.locator('#home-tour')).toBeVisible();
      await expect(page.locator(WIDGET)).toBeHidden();
      await page.locator('#home-transfer-panel-tab').click();
      await expect(page.locator(WIDGET_FORM)).toBeVisible();

      const widths = await page.evaluate((sel) => ({
        page: document.documentElement.scrollWidth - window.innerWidth,
        widget: document.querySelector(sel).scrollWidth - document.querySelector(sel).clientWidth,
        fits: document.querySelector(sel).getBoundingClientRect().right <= document.querySelector('.ticket').getBoundingClientRect().right,
      }), WIDGET);
      expect(widths.page).toBeLessThanOrEqual(0);
      expect(widths.widget).toBeLessThanOrEqual(0);
      expect(widths.fits).toBe(true);
    });
  }

  test('colors from the EasyOTA admin are overridden by the theme', async ({ page }) => {
    await mockEasyota(page, healthyApi);
    await page.goto('/index.html');
    await expect(page.locator(WIDGET_FORM)).toBeVisible();
    const search = await page.locator(`${WIDGET} #search-form > .btn`).evaluate((el) => {
      const style = getComputedStyle(el);
      return { bg: style.backgroundColor, color: style.color };
    });
    expect(search).toEqual({ bg: 'rgb(158, 190, 51)', color: 'rgb(30, 29, 26)' });
  });

  test('travelers @ 390: adding a child shows a themed age select without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockEasyota(page, healthyApi);
    await page.goto('/index.html');
    await expect(page.locator(WIDGET_FORM)).toBeVisible();

    await page.locator(`${WIDGET} .multi-items-select .select-trigger`).click();
    const dropdown = page.locator(`${WIDGET} ul.multi-items-dropdown.show`);
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('li', { hasText: /infant/i })).toHaveCount(0);
    const children = dropdown.locator('li', { has: page.locator('input[name="children"]') });
    await children.locator('button').last().click();

    const age = dropdown.locator('li.child-age select');
    await expect(age).toHaveCount(1);
    await expect(age).toBeVisible();
    await expect(dropdown.locator('li.child-age .description p')).toHaveText('Child 1 age');
    await expect(age.locator('option:not([disabled])')).toHaveText(Array.from({ length: 13 }, (_, i) => `${i} yrs`));

    const metrics = await age.evaluate((el) => {
      const style = getComputedStyle(el);
      const label = getComputedStyle(el.closest('li').querySelector('.description p'));
      const list = el.closest('ul').getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return {
        height: box.height,
        border: `${style.borderTopWidth} ${style.borderTopStyle}`,
        radius: style.borderTopLeftRadius,
        labelSize: label.fontSize,
        inList: box.left >= list.left && box.right <= list.right,
        onScreen: list.left >= 0 && list.right <= window.innerWidth,
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    const radius = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--r-input').trim());
    expect(metrics.height).toBeGreaterThanOrEqual(44);
    expect(metrics.border).toBe('1px solid');
    expect(metrics.radius).toBe(radius);
    expect(metrics.labelSize).toBe('13px');
    expect(metrics.inList).toBe(true);
    expect(metrics.onScreen).toBe(true);
    expect(metrics.pageOverflow).toBeLessThanOrEqual(0);
  });

  test('focused widget fields keep their border despite the 1.80 vendor rule', async ({ page }) => {
    await mockEasyota(page, healthyApi);
    await page.goto('/index.html');
    await expect(page.locator(WIDGET_FORM)).toBeVisible();
    // The widget can re-render while it settles, replacing the node, so focus
    // and read in one step and retry until they agree.
    await expect.poll(() => page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      el.focus();
      if (document.activeElement !== el) return null;
      const style = getComputedStyle(el);
      return { border: `${style.borderTopWidth} ${style.borderTopStyle}`, outline: `${style.outlineWidth} ${style.outlineStyle}` };
    }, `${WIDGET} .fields .field > label > input`)).toEqual({ border: '1px solid', outline: '2px solid' });
  });

  test('pages without their own slot mount the widget in the booking dialog', async ({ page }) => {
    await mockEasyota(page, healthyApi);
    await page.goto('/activities.html');
    await expect(page.locator(WIDGET)).toHaveCount(0);
    await page.locator('.site-header [data-open-booking]').first().click();
    const dialog = page.locator('#bookingDialog');
    await expect(dialog.locator(WIDGET_FORM)).toBeVisible();
    await expect(dialog.locator('#bd-transfer')).toBeHidden();
    await expect(dialog.locator(ONE_WAY)).toHaveText('Plan a private transfer');
    await dialog.locator('#bd-tour-tab').click();
    await expect(dialog.locator('#bd-tour')).toBeVisible();
  });

  test('airport transfers page mounts the widget in its booking area', async ({ page }) => {
    await mockEasyota(page, healthyApi);
    await page.goto('/airport-transfers.html#book');
    await expect(page.locator(`#book ${WIDGET_FORM}`)).toBeVisible();
    await expect(page.locator('#airport-booking-forms')).toBeHidden();
    await expect(page.locator(`#book ${ONE_WAY}`)).toBeVisible();
  });

  test('private transfers page keeps its own form, dialog included', async ({ page }) => {
    // EasyOTA's Private Transfers product needs a return date; this page
    // sells one-way and cross-border trips.
    const calls = await mockEasyota(page, healthyApi);
    // No #book hash: the header hides on scroll, and the dialog opens from it.
    await page.goto('/private-transfers.html');
    await expect(page.locator('#book [data-easyota-slot]')).toHaveCount(0);

    await page.locator('.site-header [data-open-booking]').first().click();
    const dialog = page.locator('#bookingDialog');
    await expect(dialog.locator('#bd-transfer')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(WIDGET)).toHaveCount(0);
    expect(calls).toEqual([]);

    await dialog.locator('[data-dialog-close]').click();
    await page.locator('#fields-domestic').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#fields-domestic')).toBeVisible();
    await expect(page.locator(WIDGET)).toHaveCount(0);
    expect(calls).toEqual([]);
  });

  test('axe: zero serious or critical outside the widget; widget issues reported', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockEasyota(page, healthyApi);
    await page.goto('/index.html');
    await expect(page.locator(WIDGET_FORM)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .exclude('[class^="elfsight-app"]')
      .exclude('.logo-text')
      .analyze();
    const nodes = results.violations.flatMap((v) => v.nodes.map((node) => ({ v, node })));
    const inWidget = await page.evaluate(({ targets, sel }) => targets.map((t) => {
      const el = document.querySelector(t);
      return Boolean(el && el.closest(sel));
    }), { targets: nodes.map(({ node }) => node.target[node.target.length - 1]), sel: WIDGET });
    const outside = [];
    const widget = [];
    nodes.forEach(({ v, node }, i) => {
      const entry = `${v.impact} ${v.id}: ${node.target.join(' ')}`;
      if (inWidget[i]) widget.push(entry);
      else if (['serious', 'critical'].includes(v.impact)) outside.push(entry);
    });
    // EasyOTA owns the widget markup: its issues are reported, not failed on.
    await testInfo.attach('easyota-widget-axe.json', { body: JSON.stringify(widget, null, 2), contentType: 'application/json' });
    widget.forEach((entry) => testInfo.annotations.push({ type: 'easyota-a11y', description: entry }));
    expect(outside).toEqual([]);
  });
});

test.describe('EasyOTA widget: fallback', () => {
  test('suppliers API returns 500: fallback form works through the WhatsApp / inquiry handoff', async ({ page }) => {
    const warnings = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
    await mockEasyota(page, (route) => route.fulfill({ status: 500, body: 'Server error' }));
    await page.goto('/index.html');
    const timeout = (await loadTimeout(page)) + 1000;

    const form = page.locator('#home-transfer');
    await expect(form).toBeVisible({ timeout });
    await expect.poll(() => warnings.filter((w) => w.startsWith('EasyOTA widget unavailable, using fallback form')).length, { timeout }).toBe(1);
    await expect(page.locator(WIDGET)).toHaveCount(0);

    await form.locator('#tf-to').fill('Klein Windhoek');
    await page.keyboard.press('Escape');
    await form.locator('#tf-date').fill(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    await form.locator('button[type="submit"]').click();
    const handoff = page.locator('#handoffDialog');
    await expect(handoff).toBeVisible();
    await expect(handoff.locator('[data-handoff="whatsapp"]')).toHaveAttribute('href', /wa\.me\/264816008766\?text=.*Klein%20Windhoek/);
    await expect(handoff.locator('[data-handoff="inquiry"]')).toHaveAttribute('href', /^contact\.html\?service=/);
  });

  test('widget fails to load the supplier after our check passed: fallback restored', async ({ page }) => {
    // Our pre-check succeeds, then every request the widget makes fails, so
    // it shows its own "Failed to fetch supplier details" error.
    let supplierCalls = 0;
    await mockEasyota(page, (route, path) => {
      if (path.startsWith('suppliers/')) {
        supplierCalls += 1;
        if (supplierCalls === 1) return route.fulfill({ json: supplier() });
        return route.fulfill({ status: 500, body: 'Server error' });
      }
      return route.fulfill({ json: [LOCATION] });
    });
    await page.goto('/index.html');
    const timeout = (await loadTimeout(page)) + 1000;
    await expect(page.locator('#home-transfer')).toBeVisible({ timeout });
    await expect(page.locator(WIDGET)).toHaveCount(0);
    await expect(page.locator('[data-easyota-slot]')).toBeHidden();
  });

  test('suppliers OK with empty locations: fallback shown, widget never mounted', async ({ page }) => {
    const scripts = [];
    page.on('request', (req) => { if (req.url().includes('/assets/vendor/easyota/')) scripts.push(req.url()); });
    const calls = await mockEasyota(page, (route, path) => {
      if (path.startsWith('suppliers/')) return route.fulfill({ json: supplier({ locations: [] }) });
      return route.fulfill({ json: [] });
    });
    const warnings = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
    await page.goto('/index.html');
    await expect.poll(() => calls.length).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#home-transfer')).toBeVisible();
    await expect(page.locator(WIDGET)).toHaveCount(0);
    await expect(page.locator('[data-easyota-slot]')).toBeHidden();
    expect(scripts).toEqual([]);
    expect(page.url()).not.toContain('fixedHost');
    expect(warnings).toEqual([]);
  });

  test('pickup list empty while the supplier record has a location: widget never mounted', async ({ page }) => {
    const calls = await mockEasyota(page, (route, path) => {
      if (path.startsWith('suppliers/')) return route.fulfill({ json: supplier() });
      return route.fulfill({ json: [] });
    });
    await page.goto('/index.html');
    await expect.poll(() => calls.some((c) => c.startsWith('supplierlocations/supplier-test/true'))).toBe(true);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#home-transfer')).toBeVisible();
    await expect(page.locator(WIDGET)).toHaveCount(0);
  });

  test('widget form vanishes after it was ready: fallback restored', async ({ page }) => {
    await mockEasyota(page, healthyApi);
    await page.goto('/index.html');
    await expect(page.locator(WIDGET_FORM)).toBeVisible();

    await page.evaluate((sel) => document.querySelector(sel).remove(), WIDGET_FORM);

    await expect(page.locator('#home-transfer')).toBeVisible();
    await expect(page.locator(WIDGET)).toHaveCount(0);
    await expect(page.locator('[data-easyota-slot]')).toBeHidden();
  });

  test('uncaught error from the widget bundle after ready: fallback restored', async ({ page }) => {
    // Our check sees a base location, the widget's own fetch does not. That
    // is the live misconfiguration: choosing a pickup then throws inside the
    // bundle's click handler.
    let supplierCalls = 0;
    await mockEasyota(page, (route, path) => {
      if (path.startsWith('suppliers/')) {
        supplierCalls += 1;
        return route.fulfill({ json: supplier({ locations: supplierCalls === 1 ? [LOCATION] : [] }) });
      }
      // Two pickups, so the widget waits for a choice instead of
      // auto-selecting the only one.
      return route.fulfill({ json: [LOCATION, SECOND_LOCATION] });
    });
    const reasons = [];
    page.on('console', async (msg) => {
      if (msg.type() !== 'warning') return;
      const [first, reason] = msg.args();
      if (reason && (await first.jsonValue()).startsWith('EasyOTA widget unavailable')) {
        reasons.push(await reason.evaluate((e) => String(e && e.message)));
      }
    });
    await page.goto('/index.html');
    await expect(page.locator(WIDGET_FORM)).toBeVisible();

    await page.locator(`${WIDGET} #location`).click();
    await page.locator(`${WIDGET} .select-dropdown li.option`).first().click();

    await expect(page.locator('#home-transfer')).toBeVisible();
    await expect(page.locator(WIDGET)).toHaveCount(0);
    // Restored by the window error listener, not by the form vanishing.
    await expect.poll(() => reasons).toEqual([expect.not.stringContaining('disappeared')]);
  });

  // Serves the local site as https://tot-wa.com, optionally rewriting
  // booking.js, so the production gate sees a production hostname.
  async function asProduction(page, rewrite = (js) => js) {
    await page.route('https://tot-wa.com/**', async (route) => {
      const url = route.request().url().replace('https://tot-wa.com', 'http://localhost:4173');
      const response = await route.fetch({ url });
      if (!url.includes('/assets/js/booking.js')) return route.fulfill({ response });
      return route.fulfill({ response, body: rewrite(await response.text()) });
    });
  }

  test('production gate: tot-wa.com keeps our form while productionEnabled is false', async ({ page }) => {
    const calls = await mockEasyota(page, healthyApi);
    await asProduction(page);
    await page.goto('https://tot-wa.com/index.html');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => BOOKING_CONFIG.easyota.productionEnabled)).toBe(false);
    expect(calls).toEqual([]);
    await expect(page.locator('#home-transfer')).toBeVisible();
    await expect(page.locator(WIDGET)).toHaveCount(0);
  });

  test('production gate: tot-wa.com mounts the widget once productionEnabled is true', async ({ page }) => {
    await mockEasyota(page, healthyApi);
    await asProduction(page, (js) => js.replace('productionEnabled: false,', 'productionEnabled: true,'));
    await page.goto('https://tot-wa.com/index.html');
    await expect(page.locator(WIDGET_FORM)).toBeVisible();
    await expect(page.locator('#home-transfer')).toBeHidden();
    // Production relies on the hostname lookup, so no fixedHost is added.
    expect(page.url()).toBe('https://tot-wa.com/index.html');
  });

  test('kill switch: easyota.enabled false never calls the API', async ({ page }) => {
    const calls = await mockEasyota(page, healthyApi);
    await page.route('**/assets/js/booking.js', async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace('enabled: true,', 'enabled: false,');
      return route.fulfill({ response, body });
    });
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    expect(calls).toEqual([]);
    await expect(page.locator('#home-transfer')).toBeVisible();
  });
});
