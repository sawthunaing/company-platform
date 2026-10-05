import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { describe, expect, it, vi } from 'vitest';
import { ContentUnavailableError, fetchHome, getHome, REVALIDATE_SECONDS } from '@/lib/content';
import { homeMetadata } from '@/lib/metadata';
import { CONTENT } from './fixtures';

const reply = (status: number, body: unknown = CONTENT) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('Loading content', () => {
  it('reads GET /api/home and refreshes it every 60 seconds', async () => {
    const fetch = reply(200);
    vi.stubGlobal('fetch', fetch);

    await expect(fetchHome()).resolves.toEqual(CONTENT);
    expect(REVALIDATE_SECONDS).toBe(60);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/home', { next: { revalidate: 60 } });
  });

  it('fills in missing lists so the page can render', async () => {
    vi.stubGlobal('fetch', reply(200, { heroTitle: 'T', heroSubtitle: '' }));
    await expect(fetchHome()).resolves.toMatchObject({ sections: [], contact: {} });
  });

  it('throws when the API answers with an error, so the cached page is kept', async () => {
    vi.stubGlobal('fetch', reply(503, { message: 'down' }));
    await expect(getHome()).rejects.toThrow(new ContentUnavailableError('GET /api/home returned 503'));
  });

  it('throws when the API cannot be reached, so the cached page is kept', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(getHome()).rejects.toBeInstanceOf(ContentUnavailableError);
  });

  it('returns no content during the build when the API cannot be reached', async () => {
    vi.stubEnv('NEXT_PHASE', PHASE_PRODUCTION_BUILD);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(getHome()).resolves.toBeNull();
  });
});

describe('Page metadata', () => {
  it('uses the hero for the title, description and Open Graph tags', () => {
    expect(homeMetadata(CONTENT)).toMatchObject({
      title: CONTENT.heroTitle,
      description: CONTENT.heroSubtitle,
      openGraph: {
        title: CONTENT.heroTitle,
        description: CONTENT.heroSubtitle,
        images: [{ url: 'http://localhost:3000/uploads/3f2a.png' }],
      },
    });
  });

  it('falls back to the first section, shortened, when there is no subtitle', () => {
    const body = 'x'.repeat(300);
    const meta = homeMetadata({ ...CONTENT, heroSubtitle: '', sections: [{ title: 'S', body }] });
    expect(meta.description).toHaveLength(160);
    expect(meta.description?.endsWith('…')).toBe(true);
  });

  it('keeps the placeholder page out of search results', () => {
    expect(homeMetadata(null)).toEqual({ robots: { index: false } });
  });
});
