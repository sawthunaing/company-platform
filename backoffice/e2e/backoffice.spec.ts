import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { API, PNG_1X1, STAFF_EMAIL, STAFF_PASSWORD } from './env';

// The suite edits the real home content. Keep the original and put it back at the end.
let original: Record<string, unknown>;

async function apiToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/api/auth/login`, { data: { email: STAFF_EMAIL, password: STAFF_PASSWORD } });
  expect(res.ok()).toBe(true);
  return (await res.json()).accessToken;
}

test.beforeAll(async ({ request }) => {
  const { updatedAt: _updatedAt, ...content } = await (await request.get(`${API}/api/home`)).json();
  original = content;
});

test.afterAll(async ({ request }) => {
  const token = await apiToken(request);
  const res = await request.put(`${API}/api/home`, { headers: { Authorization: `Bearer ${token}` }, data: original });
  expect(res.ok()).toBe(true);
});

async function logIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/^Email/).fill(STAFF_EMAIL);
  await page.getByLabel(/^Password/).fill(STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Home page content' })).toBeVisible();
}

test.describe('Log in and log out', () => {
  test('staff logs in, logs out, and can no longer open the editor', async ({ page }) => {
    await logIn(page);
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('You have logged out.')).toBeVisible();

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('not logged in, open the editor → login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Backoffice login' })).toBeVisible();
  });

  test('wrong password → error shown', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/^Email/).fill('nobody@company.com');
    await page.getByLabel(/^Password/).fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Wrong email or password.');
  });
});

test.describe('Edit and save', () => {
  test('edits are saved and returned by GET /api/home', async ({ page, request }) => {
    const stamp = `E2E ${Date.now()}`;
    await logIn(page);

    await page.getByLabel(/^Hero title/).fill(stamp);
    await page.getByLabel(/^Hero subtitle/).fill('Saved by the e2e test.');

    // Start from a known list: remove all sections, then add two and swap them.
    const removeButtons = page.getByRole('button', { name: /^Remove section/ });
    while ((await removeButtons.count()) > 0) await removeButtons.first().click();
    await page.getByRole('button', { name: 'Add section' }).click();
    await page.getByRole('group', { name: 'Section 1' }).getByLabel(/^Title/).fill('First');
    await page.getByRole('button', { name: 'Add section' }).click();
    await page.getByRole('group', { name: 'Section 2' }).getByLabel(/^Title/).fill('Second');
    await page.getByRole('group', { name: 'Section 2' }).getByLabel(/^Text/).fill('Moved to the top.');
    await page.getByRole('button', { name: 'Move section 2 up' }).click();

    await page.getByLabel(/^Contact email/).fill('e2e@company.com');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText(/^Saved\./);

    const home = await (await request.get(`${API}/api/home`)).json();
    expect(home).toMatchObject({
      heroTitle: stamp,
      heroSubtitle: 'Saved by the e2e test.',
      sections: [
        { title: 'Second', body: 'Moved to the top.' },
        { title: 'First', body: '' },
      ],
      contact: { email: 'e2e@company.com' },
    });

    // A reload shows the saved values.
    await page.reload();
    await expect(page.getByLabel(/^Hero title/)).toHaveValue(stamp);
  });

  test('empty hero title → error shown and nothing is saved', async ({ page, request }) => {
    const before = await (await request.get(`${API}/api/home`)).json();
    await logIn(page);
    await page.getByLabel(/^Hero title/).fill('');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Hero title is required.')).toBeVisible();
    const after = await (await request.get(`${API}/api/home`)).json();
    expect(after.updatedAt).toBe(before.updatedAt);
  });
});

test.describe('Hero image', () => {
  test('PNG upload → preview shown, URL saved, file served by the API', async ({ page, request }) => {
    await logIn(page);
    await page.getByLabel('Hero image').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: PNG_1X1 });

    const preview = page.getByAltText('Current hero image');
    await expect(preview).toBeVisible();
    // naturalWidth > 0 means the browser loaded the image (CORS, URL and type all fine).
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText(/^Saved\./);
    const { heroImageUrl } = await (await request.get(`${API}/api/home`)).json();
    expect(heroImageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect((await request.get(`${API}${heroImageUrl}`)).status()).toBe(200);
  });

  test('3 MB image → size error shown', async ({ page }) => {
    await logIn(page);
    await page
      .getByLabel('Hero image')
      .setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(3 * 1024 * 1024) });
    await expect(page.getByRole('alert')).toHaveText('Image must be 2 MB or smaller.');
  });

  test('a PDF named .png gets past the browser check → API rejects it', async ({ page }) => {
    await logIn(page);
    await page
      .getByLabel('Hero image')
      .setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('%PDF-1.7 not an image') });
    await expect(page.getByRole('alert')).toHaveText('Only JPEG, PNG or WebP images.');
  });
});
