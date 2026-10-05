import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from './render';
import { API, calls, fakeToken, resetCalls, server } from './server';

beforeEach(resetCalls);

const MB = 1024 * 1024;
const file = (name: string, type: string, bytes: number) => new File([new Uint8Array(bytes)], name, { type });

async function openEditor() {
  const r = renderApp('/', fakeToken());
  await screen.findByDisplayValue('Welcome');
  return { ...r, input: screen.getByLabelText('Hero image') as HTMLInputElement };
}

describe('Hero image upload', () => {
  it('3 MB image → "Image must be 2 MB or smaller." and nothing is uploaded', async () => {
    const { user, input } = await openEditor();
    await user.upload(input, file('big.png', 'image/png', 3 * MB));
    expect(screen.getByRole('alert')).toHaveTextContent('Image must be 2 MB or smaller.');
    expect(calls.uploads).toBe(0);
  });

  it('PDF → "Only JPEG, PNG or WebP images." and nothing is uploaded', async () => {
    const { user, input } = await openEditor();
    await user.upload(input, file('doc.pdf', 'application/pdf', 1000));
    expect(screen.getByRole('alert')).toHaveTextContent('Only JPEG, PNG or WebP images.');
    expect(calls.uploads).toBe(0);
  });

  it('SVG → rejected', async () => {
    const { user, input } = await openEditor();
    await user.upload(input, file('logo.svg', 'image/svg+xml', 1000));
    expect(screen.getByRole('alert')).toHaveTextContent('Only JPEG, PNG or WebP images.');
    expect(calls.uploads).toBe(0);
  });

  it('exactly 2 MB PNG → accepted', async () => {
    const { user, input } = await openEditor();
    await user.upload(input, file('edge.png', 'image/png', 2 * MB));
    await screen.findByAltText('Current hero image');
    expect(calls.uploads).toBe(1);
  });

  it('1 MB PNG → uploaded, preview shown, URL sent on save', async () => {
    const { user, input } = await openEditor();
    await user.upload(input, file('hero.png', 'image/png', 1 * MB));
    const img = await screen.findByAltText('Current hero image');
    expect(img).toHaveAttribute('src', `${API}/uploads/abc.png`);
    expect(calls.uploads).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText(/^Saved\./);
    expect(calls.put[0]).toMatchObject({ heroImageUrl: '/uploads/abc.png' });
  });

  it('server says 415 (content is not really an image) → type error shown', async () => {
    server.use(
      http.post(`${API}/api/uploads/hero`, () =>
        HttpResponse.json({ statusCode: 415, error: 'unsupported_type' }, { status: 415 }),
      ),
    );
    const { user, input } = await openEditor();
    await user.upload(input, file('fake.png', 'image/png', 1000));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only JPEG, PNG or WebP images.');
  });

  it('server says 413 → size error shown', async () => {
    server.use(
      http.post(`${API}/api/uploads/hero`, () =>
        HttpResponse.json({ statusCode: 413, error: 'file_too_large' }, { status: 413 }),
      ),
    );
    const { user, input } = await openEditor();
    await user.upload(input, file('hero.png', 'image/png', 1000));
    expect(await screen.findByRole('alert')).toHaveTextContent('Image must be 2 MB or smaller.');
  });

  it('Remove image → heroImageUrl left out on save', async () => {
    const { user, input } = await openEditor();
    await user.upload(input, file('hero.png', 'image/png', 1000));
    await screen.findByAltText('Current hero image');
    await user.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(screen.queryByAltText('Current hero image')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText(/^Saved\./);
    expect(calls.put[0]).not.toHaveProperty('heroImageUrl');
  });
});
