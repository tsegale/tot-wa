// Site-wide UI checks, run for every page (including the generated tour
// pages) at three viewports. See playwright.config.js for the server.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const ROOT = path.resolve(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1440, height: 900 },
];
const BANNED_TEXT = ['placeholder', 'embeds here', 'EasyOTA', 'slot', 'TODO', '—', '&rarr;'];

// Only the site itself and its fonts load in tests. Third-party widgets
// (Elfsight reviews, Google Maps) are blocked so results are repeatable.
async function isolate(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://localhost') || /fonts\.(googleapis|gstatic)\.com/.test(url)) return route.continue();
    return route.abort();
  });
}

function futureDate(days = 30) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

// Fills every required, visible field in a booking form with valid values.
async function fillRequired(form) {
  const fields = await form.locator('input[required], select[required]').all();
  for (const field of fields) {
    if (!(await field.isVisible())) continue;
    const type = await field.evaluate((el) => (el.tagName === 'SELECT' ? 'select' : el.type));
    if (type === 'date') await field.fill(futureDate());
    else if (type === 'number') await field.fill('2');
    else if (type === 'select') {
      const value = await field.evaluate((el) => [...el.options].find((o) => o.value)?.value);
      await field.selectOption(value);
    } else await field.fill('Klein Windhoek');
  }
  // The suburb typeahead may be open over the submit button.
  await form.page().keyboard.press('Escape');
}

async function closeOpenDialog(page) {
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
}

for (const file of PAGES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${file} @ ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport });

      test.beforeEach(async ({ page }) => {
        await isolate(page);
        await page.goto(`/${file}`);
        await page.waitForLoadState('load');
      });

      test('has no horizontal overflow', async ({ page }) => {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });

      test('has no serious or critical axe violations', async ({ page }) => {
        // The logotype is excluded: its fixed brand-green "TOT" is exempt from
        // contrast requirements under WCAG 1.4.3 (text that is part of a logo).
        const results = await new AxeBuilder({ page })
          .exclude('[class^="elfsight-app"]')
          .exclude('.logo-text')
          .analyze();
        const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
        const summary = serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
        expect(summary).toEqual([]);
      });

      test('every button leads somewhere real', async ({ page }) => {
        const buttons = await page.locator('a.btn, button.btn').all();
        for (const btn of buttons) {
          if (!(await btn.isVisible())) continue;
          const info = await btn.evaluate((el) => ({
            tag: el.tagName,
            href: el.getAttribute('href'),
            openBooking: el.hasAttribute('data-open-booking'),
            type: el.getAttribute('type'),
            bookingForm: Boolean(el.closest('[data-booking-form]')),
            contactStep: Boolean(el.closest('#contactForm')),
            label: el.textContent.trim(),
          }));
          const where = `${info.tag} "${info.label}"`;

          if (info.tag === 'A') {
            expect(info.href, where).toBeTruthy();
            expect(info.href, where).not.toBe('#');
            if (info.href.startsWith('#')) {
              expect(await page.locator(info.href).count(), `${where} anchor`).toBe(1);
            } else if (!/^(https?:|tel:|mailto:)/.test(info.href)) {
              const target = info.href.split(/[?#]/)[0];
              expect(fs.existsSync(path.join(ROOT, target)), `${where} target ${target}`).toBe(true);
            } else if (/^https?:/.test(info.href)) {
              expect(info.href, where).toMatch(/^https:\/\/(wa\.me|www\.google\.com\/maps)/);
            }
            if (info.openBooking) {
              await btn.click();
              await expect(page.locator('#bookingDialog'), where).toBeVisible();
              await closeOpenDialog(page);
            }
            continue;
          }

          // In-form step controls and the contact submit post to the API,
          // which the static test server does not provide.
          if (info.contactStep) continue;

          if (info.type === 'submit' && info.bookingForm) {
            const form = btn.locator('xpath=ancestor::form[1]');
            await fillRequired(form);
            await btn.click();
            await expect(page.locator('dialog[open]'), where).toBeVisible();
            await closeOpenDialog(page);
            continue;
          }

          await btn.click();
          await expect(page.locator('dialog[open]'), where).toBeVisible();
          await closeOpenDialog(page);
        }
      });

      if (viewport.width <= 1080) {
        test('mobile drawer opens, is closable and returns focus', async ({ page }) => {
          const toggle = page.locator('#menuToggle');
          await toggle.click();
          const drawer = page.locator('#navLinks');
          await expect(drawer).toHaveClass(/open/);
          const close = page.locator('#menuClose');
          await expect(close).toBeVisible();
          await expect(close).toBeFocused();
          // The drawer covers the hamburger; the close button replaces it.
          const box = await toggle.boundingBox();
          const covered = await page.evaluate(([x, y]) => !document.elementFromPoint(x, y)?.closest('#menuToggle'),
            [box.x + box.width / 2, box.y + box.height / 2]);
          expect(covered).toBe(true);
          await page.keyboard.press('Escape');
          await expect(drawer).not.toHaveClass(/open/);
          await expect(toggle).toBeFocused();

          await toggle.click();
          await page.locator('#navBackdrop').click({ position: { x: 10, y: 300 } });
          await expect(drawer).not.toHaveClass(/open/);
          await toggle.click();
          await close.click();
          await expect(drawer).not.toHaveClass(/open/);
        });
      }

      test('header links keep 4.5:1 contrast at the top and after scrolling', async ({ page }) => {
        for (const scroll of [0, 400]) {
          if (scroll) {
            // Land on 400 while scrolling up so the auto-hiding header shows.
            await page.evaluate(() => window.scrollTo(0, 420));
            await page.waitForTimeout(100);
            await page.evaluate(() => window.scrollTo(0, 400));
          } else {
            await page.evaluate(() => window.scrollTo(0, 0));
          }
          await page.waitForTimeout(400);
          const results = await page.evaluate(() => {
            const parse = (c) => {
              const m = c.match(/rgba?\(([^)]+)\)/);
              if (!m) return null;
              const [r, g, b, a = 1] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
              return { r, g, b, a };
            };
            const blend = (top, bottom) => ({
              r: top.r * top.a + bottom.r * (1 - top.a),
              g: top.g * top.a + bottom.g * (1 - top.a),
              b: top.b * top.a + bottom.b * (1 - top.a),
              a: 1,
            });
            const lum = ({ r, g, b }) => {
              const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
              return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
            };
            const header = document.getElementById('siteHeader');
            const glass = parse(getComputedStyle(header, '::before').backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
            const targets = [...header.querySelectorAll('.nav-list > li > a, .nav-dropdown-toggle, .logo-wa')]
              .filter((el) => {
                const s = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return s.visibility === 'visible' && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
              });
            return targets.map((el) => {
              const r = el.getBoundingClientRect();
              const under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
                .find((n) => !header.contains(n) && (parse(getComputedStyle(n).backgroundColor) || {}).a > 0);
              const base = under ? parse(getComputedStyle(under).backgroundColor) : parse(getComputedStyle(document.body).backgroundColor);
              const bg = blend(glass, { ...base, a: 1 });
              const fg = parse(getComputedStyle(el).color);
              const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
              return { text: el.textContent.trim(), ratio: (l1 + 0.05) / (l2 + 0.05) };
            });
          });
          expect(results.length).toBeGreaterThan(0);
          for (const { text, ratio } of results) expect(ratio, `"${text}" at scroll ${scroll}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      test('no text renders below 13px', async ({ page }) => {
        const small = await page.evaluate(() => {
          const out = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const el = node.parentElement;
            if (!node.textContent.trim() || !el || el.closest('script, style, noscript, [aria-hidden="true"] svg')) continue;
            if (!el.getClientRects().length || getComputedStyle(el).visibility !== 'visible') continue;
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (size < 12.99) out.push(`${size}px: ${node.textContent.trim().slice(0, 40)}`);
          }
          return out;
        });
        expect(small).toEqual([]);
      });

      test('no placeholder or banned text is visible', async ({ page }) => {
        const text = await page.evaluate(() => document.body.innerText);
        for (const banned of BANNED_TEXT) {
          expect(text.toLowerCase().includes(banned.toLowerCase()), `contains "${banned}"`).toBe(false);
        }
      });
    });
  }
}

test.describe('booking dialog', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('empty transfer shows inline errors, valid transfer opens the continue dialog', async ({ page }) => {
    await isolate(page);
    await page.goto('/index.html');
    await page.locator('.site-header .nav-cta').click();
    const dialog = page.locator('#bookingDialog');
    await expect(dialog).toBeVisible();

    const form = dialog.locator('#bd-transfer');
    await form.locator('#bd-tf-pax').fill('');
    await form.locator('button[type="submit"]').click();
    const dropoff = form.locator('#bd-tf-to');
    await expect(dropoff).toHaveAttribute('aria-invalid', 'true');
    await expect(dropoff).toBeFocused();
    await expect(form.locator('#bd-tf-date')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('#bd-tf-date-error')).toHaveText('Choose a travel date');
    await expect(form.locator('#bd-tf-date')).toHaveAttribute('aria-describedby', /bd-tf-date-error/);

    await dropoff.fill('Klein Windhoek');
    await page.keyboard.press('Escape');
    await form.locator('#bd-tf-date').fill(futureDate());
    await form.locator('#bd-tf-pax').fill('2');
    await form.locator('button[type="submit"]').click();

    const handoff = page.locator('#handoffDialog');
    await expect(handoff).toBeVisible();
    await expect(handoff.locator('h2')).toHaveText('How would you like to continue?');
    const wa = await handoff.locator('[data-handoff="whatsapp"]').getAttribute('href');
    expect(decodeURIComponent(wa)).toContain('Service: Airport transfer. From: Hosea Kutako Intl. (HKIA). To: Klein Windhoek.');
    const inquiry = await handoff.locator('[data-handoff="inquiry"]').getAttribute('href');
    expect(inquiry).toMatch(/^contact\.html\?service=airport-transfer&route=/);
  });

  test('inquiry link prefills the contact form and skips to the first incomplete step', async ({ page }) => {
    await isolate(page);
    await page.goto(`/contact.html?service=tour&route=7-Day%20Northbound&date=${futureDate()}&pax=3`);
    await expect(page.locator('#stepText')).toHaveText('Step 3 of 3');
    await expect(page.locator('input[name="service"][value="tour"]')).toBeChecked();
    await expect(page.locator('#cf-route')).toHaveValue('7-Day Northbound');
    await expect(page.locator('#cf-pax')).toHaveValue('3');
  });
});

test.describe('transfer booking options', () => {
  for (const file of ['airport-transfers.html', 'private-transfers.html']) {
    test(`${file}: checkboxes precede the submit button in every mode`, async ({ page }) => {
      await isolate(page);
      await page.goto(`/${file}`);
      const result = await page.evaluate(() => [...document.querySelectorAll('form[data-booking-form]')]
        .filter((form) => form.querySelector('input[type="checkbox"]'))
        .map((form) => {
          const submit = form.querySelector('[type="submit"]');
          const boxes = [...form.querySelectorAll('input[type="checkbox"]')];
          return {
            id: form.id,
            count: boxes.length,
            allBefore: boxes.every((box) => Boolean(box.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING)),
          };
        }));
      expect(result.length).toBe(2);
      for (const form of result) {
        expect(form.count, form.id).toBe(2);
        expect(form.allBefore, `${form.id} checkboxes before submit`).toBe(true);
      }
    });
  }
});
