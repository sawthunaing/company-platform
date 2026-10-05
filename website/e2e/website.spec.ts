import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { LABELS } from '../lib/labels';
import { DEFAULT_CONTENT } from './mock-api.mjs';

// The tests run in order: the last two change the content and stop the API.
test.describe.configure({ mode: 'serial' });

const CONTROL = 'http://localhost:3998';
const API = 'http://localhost:3999';
const REVALIDATE_MS = 60_000;

async function control(request: APIRequestContext, method: 'post' | 'put', path: string, data?: unknown) {
  const res = await request[method](`${CONTROL}${path}`, { data });
  expect(res.ok()).toBe(true);
}

const heroTitle = (page: Page) => page.getByRole('heading', { level: 1 }).textContent();

// Reload until the hero shows `title`; returns how long it took.
async function waitForHero(page: Page, title: string, timeout: number): Promise<number> {
  const start = Date.now();
  await expect
    .poll(
      async () => {
        await page.reload();
        return heroTitle(page);
      },
      { timeout, intervals: [2_000] },
    )
    .toBe(title);
  return Date.now() - start;
}

test.afterAll(async ({ request }) => {
  await request.post(`${CONTROL}/reset`);
});

test.describe('1. Home page', () => {
  test('page loads → all text comes from GET /api/home', async ({ page }) => {
    await page.goto('/');
    const c = DEFAULT_CONTENT;

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.heroTitle);
    await expect(page.getByText(c.heroSubtitle)).toBeVisible();
    for (const s of c.sections) {
      await expect(page.getByRole('heading', { level: 2, name: s.title })).toBeVisible();
      await expect(page.getByText(s.body)).toBeVisible();
    }
    for (const value of Object.values(c.contact)) await expect(page.getByText(value).first()).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText(`© ${new Date().getFullYear()} ${c.heroTitle}`);

    // Nothing else: every line on the page is API content or a contact label.
    const allowed = new Set(
      [
        c.heroTitle,
        c.heroSubtitle,
        ...c.sections.flatMap((s) => [s.title, s.body]),
        ...Object.values(c.contact),
        LABELS.contact,
        LABELS.email,
        LABELS.phone,
        LABELS.address,
        `© ${new Date().getFullYear()} ${c.heroTitle}`,
      ].map((t) => t.toLowerCase()),
    );
    const lines = (await page.locator('body').innerText())
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    expect(lines.filter((l) => !allowed.has(l.toLowerCase()))).toEqual([]);
  });

  test('hero image from the API loads', async ({ page }) => {
    await page.goto('/');
    const img = page.locator('header img');
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  });
});

test.describe('3. SEO', () => {
  test('title, meta description and Open Graph tags come from the content', async ({ page }) => {
    await page.goto('/');
    const c = DEFAULT_CONTENT;
    const meta = (selector: string) => page.locator(selector).getAttribute('content');

    await expect(page).toHaveTitle(c.heroTitle);
    expect(await meta('meta[name="description"]')).toBe(c.heroSubtitle);
    expect(await meta('meta[property="og:title"]')).toBe(c.heroTitle);
    expect(await meta('meta[property="og:description"]')).toBe(c.heroSubtitle);
    expect(await meta('meta[property="og:image"]')).toBe(`${API}${c.heroImageUrl}`);
    expect(await meta('meta[property="og:type"]')).toBe('website');
  });

  test('open /sitemap.xml → valid sitemap', async ({ request, baseURL }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');
    const xml = await res.text();
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${baseURL}/</loc>`);
  });

  test('open /robots.txt → file served', async ({ request, baseURL }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Allow: /');
    expect(body).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  });
});

test.describe('4. Responsive', () => {
  for (const width of [375, 768, 1440]) {
    test(`${width} px → layout intact`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      // No sideways scrolling.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      // Every heading, paragraph, link and the image sits inside the screen.
      const boxes = await page.locator('h1, h2, p, a, dd, header img').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, text: el.textContent?.slice(0, 30), left: r.left, right: r.right, width: r.width };
        }),
      );
      const outside = boxes.filter((b) => b.width === 0 || b.left < 0 || b.right > width + 0.5);
      expect(outside).toEqual([]);

      const shot = testInfo.outputPath(`layout-${width}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      await testInfo.attach(`layout-${width}`, { path: shot, contentType: 'image/png' });
    });
  }
});

test.describe('2. Content loading', () => {
  test('content change → shown on the site within 60 s', async ({ page, request }) => {
    test.setTimeout(3 * REVALIDATE_MS);
    await page.goto('/');

    // Make the page regenerate now, so the next change has to wait the full 60 s window.
    const first = { ...DEFAULT_CONTENT, heroTitle: `First change ${Date.now()}` };
    await control(request, 'put', '/content', first);
    await waitForHero(page, first.heroTitle, REVALIDATE_MS + 10_000);

    const second = { ...DEFAULT_CONTENT, heroTitle: `Second change ${Date.now()}` };
    await control(request, 'put', '/content', second);
    const took = await waitForHero(page, second.heroTitle, REVALIDATE_MS + 10_000);

    test.info().annotations.push({ type: 'seconds to appear', description: (took / 1000).toFixed(1) });
    // 60 s refresh window plus one 2 s reload interval.
    expect(took).toBeLessThanOrEqual(REVALIDATE_MS + 3_000);
  });

  test('API stopped → page still shows last cached content', async ({ page, request }) => {
    test.setTimeout(3 * REVALIDATE_MS);
    await page.goto('/');
    const shown = await heroTitle(page);
    expect(shown).toBeTruthy();

    await control(request, 'post', '/down');
    expect((await request.get(`${API}/api/home`).catch(() => null))?.ok() ?? false).toBe(false);

    // Past the refresh window, so the next visits try (and fail) to regenerate.
    await page.waitForTimeout(REVALIDATE_MS + 2_000);
    for (let i = 0; i < 3; i++) {
      const res = await page.reload();
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(shown!);
      await expect(page.getByRole('heading', { level: 2, name: 'Cloud migration' })).toBeVisible();
      await page.waitForTimeout(2_000);
    }

    await control(request, 'post', '/up');
  });
});
