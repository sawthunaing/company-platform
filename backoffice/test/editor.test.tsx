import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from './render';
import { API, calls, fakeToken, resetCalls, server } from './server';

beforeEach(resetCalls);

async function openEditor() {
  const r = renderApp('/', fakeToken());
  await screen.findByDisplayValue('Welcome');
  return r;
}

const section = (n: number) => screen.getByRole('group', { name: `Section ${n}` });
const save = (user: Awaited<ReturnType<typeof openEditor>>['user']) =>
  user.click(screen.getByRole('button', { name: 'Save' }));

describe('Loading', () => {
  it('fields are filled from GET /api/home', async () => {
    await openEditor();
    expect(screen.getByLabelText(/^Hero title/)).toHaveValue('Welcome');
    expect(screen.getByLabelText(/^Hero subtitle/)).toHaveValue('We build things.');
    expect(within(section(1)).getByLabelText(/^Title/)).toHaveValue('Services');
    expect(within(section(2)).getByLabelText(/^Title/)).toHaveValue('About');
    expect(screen.getByLabelText(/^Contact email/)).toHaveValue('hello@company.com');
  });

  it('load fails → error with a Try again button', async () => {
    server.use(http.get(`${API}/api/home`, () => HttpResponse.json({ message: 'Server error' }, { status: 500 })));
    renderApp('/', fakeToken());
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('Validation', () => {
  it('empty hero title → "Hero title is required." and nothing is sent', async () => {
    const { user } = await openEditor();
    await user.clear(screen.getByLabelText(/^Hero title/));
    await save(user);
    expect(screen.getByText('Hero title is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Hero title/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Fix the highlighted fields before saving.');
    expect(calls.put).toHaveLength(0);
  });

  it('empty section title → error in that section and nothing is sent', async () => {
    const { user } = await openEditor();
    await user.clear(within(section(2)).getByLabelText(/^Title/));
    await save(user);
    expect(within(section(2)).getByText('Section title is required.')).toBeInTheDocument();
    expect(within(section(1)).queryByText('Section title is required.')).toBeNull();
    expect(calls.put).toHaveLength(0);
  });

  it('new empty section → error on save', async () => {
    const { user } = await openEditor();
    await user.click(screen.getByRole('button', { name: 'Add section' }));
    await save(user);
    expect(within(section(3)).getByText('Section title is required.')).toBeInTheDocument();
    expect(calls.put).toHaveLength(0);
  });

  it('invalid contact email → error and nothing is sent', async () => {
    const { user } = await openEditor();
    const email = screen.getByLabelText(/^Contact email/);
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await save(user);
    expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument();
    expect(calls.put).toHaveLength(0);
  });

  it('fixing the field after a failed save → error goes away', async () => {
    const { user } = await openEditor();
    const title = screen.getByLabelText(/^Hero title/);
    await user.clear(title);
    await save(user);
    expect(screen.getByText('Hero title is required.')).toBeInTheDocument();
    await user.type(title, 'Back again');
    expect(screen.queryByText('Hero title is required.')).toBeNull();
  });

  it('whitespace-only hero title → treated as empty', async () => {
    const { user } = await openEditor();
    const title = screen.getByLabelText(/^Hero title/);
    await user.clear(title);
    await user.type(title, '   ');
    await save(user);
    expect(screen.getByText('Hero title is required.')).toBeInTheDocument();
  });
});

describe('Sections', () => {
  it('add, reorder and remove sections → PUT sends the new list in order', async () => {
    const { user } = await openEditor();
    await user.click(screen.getByRole('button', { name: 'Add section' }));
    await user.type(within(section(3)).getByLabelText(/^Title/), 'Contact');
    await user.type(within(section(3)).getByLabelText(/^Text/), 'Write to us.');
    await user.click(screen.getByRole('button', { name: 'Move section 3 up' }));
    await user.click(screen.getByRole('button', { name: 'Remove section 1' }));
    await save(user);
    await screen.findByText(/^Saved\./);
    expect(calls.put).toHaveLength(1);
    expect((calls.put[0] as { sections: unknown }).sections).toEqual([
      { title: 'Contact', body: 'Write to us.' },
      { title: 'About', body: 'Since 2026.' },
    ]);
  });

  it('first section → Move up disabled, last section → Move down disabled', async () => {
    await openEditor();
    expect(screen.getByRole('button', { name: 'Move section 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move section 2 down' })).toBeDisabled();
  });
});

describe('Save', () => {
  it('valid content → PUT /api/home with the edited fields and a success message', async () => {
    const { user } = await openEditor();
    const title = screen.getByLabelText(/^Hero title/);
    await user.clear(title);
    await user.type(title, 'New title');
    await user.clear(screen.getByLabelText(/^Contact email/));
    await user.type(screen.getByLabelText(/^Phone/), '+44 20 0000 0000');
    await save(user);
    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(calls.put[0]).toEqual({
      heroTitle: 'New title',
      heroSubtitle: 'We build things.',
      sections: [
        { title: 'Services', body: 'Web apps.' },
        { title: 'About', body: 'Since 2026.' },
      ],
      // Empty email is left out, not sent as "".
      contact: { phone: '+44 20 0000 0000' },
    });
  });

  it('server error on save → error message, edits kept', async () => {
    server.use(
      http.put(`${API}/api/home`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Internal server error' }, { status: 500 }),
      ),
    );
    const { user } = await openEditor();
    const title = screen.getByLabelText(/^Hero title/);
    await user.clear(title);
    await user.type(title, 'Unsaved');
    await save(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed: Internal server error');
    expect(title).toHaveValue('Unsaved');
  });

  it('server rejects the content (400) → its messages are shown', async () => {
    server.use(
      http.put(`${API}/api/home`, () =>
        HttpResponse.json({ statusCode: 400, message: ['heroTitle must be shorter'] }, { status: 400 }),
      ),
    );
    const { user } = await openEditor();
    await save(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed: heroTitle must be shorter');
  });
});
