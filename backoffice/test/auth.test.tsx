import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './render';
import { API, calls, fakeToken, PASSWORD, resetCalls, server } from './server';

beforeEach(resetCalls);
afterEach(() => vi.useRealTimers());

const editorHeading = () => screen.findByRole('heading', { name: 'Home page content' });

describe('Not logged in', () => {
  it('opening the editor → redirected to the login page', async () => {
    const { path } = renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Backoffice login' })).toBeInTheDocument();
    expect(path()).toBe('/login');
  });

  it('opening an unknown page → redirected to the login page', async () => {
    const { path } = renderApp('/anything');
    await screen.findByRole('heading', { name: 'Backoffice login' });
    expect(path()).toBe('/login');
  });

  it('expired token in storage → redirected to the login page', async () => {
    const { path } = renderApp('/', fakeToken(-10));
    await screen.findByRole('heading', { name: 'Backoffice login' });
    expect(path()).toBe('/login');
    expect(sessionStorage.getItem('backoffice.token')).toBeNull();
  });
});

describe('Log in', () => {
  it('correct email and password → editor opens and token is stored', async () => {
    const { user, path } = renderApp('/login');
    await user.type(screen.getByLabelText(/^Email/), 'staff@company.com');
    await user.type(screen.getByLabelText(/^Password/), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await editorHeading()).toBeInTheDocument();
    expect(path()).toBe('/');
    expect(sessionStorage.getItem('backoffice.token')).toMatch(/^ey/);
  });

  it('wrong password → error shown, stays on login', async () => {
    const { user, path } = renderApp('/login');
    await user.type(screen.getByLabelText(/^Email/), 'staff@company.com');
    await user.type(screen.getByLabelText(/^Password/), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
    expect(path()).toBe('/login');
  });

  it('too many tries (429) → wait message shown', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () =>
        HttpResponse.json({ statusCode: 429, error: 'too_many_attempts' }, { status: 429 }),
      ),
    );
    const { user } = renderApp('/login');
    await user.type(screen.getByLabelText(/^Email/), 'staff@company.com');
    await user.type(screen.getByLabelText(/^Password/), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wait 15 minutes');
  });

  it('empty email and password → field errors, no request', async () => {
    let requested = false;
    server.use(
      http.post(`${API}/api/auth/login`, () => {
        requested = true;
        return HttpResponse.json({});
      }),
    );
    const { user } = renderApp('/login');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  it('already logged in, open /login → sent to the editor', async () => {
    const { path } = renderApp('/login', fakeToken());
    await editorHeading();
    expect(path()).toBe('/');
  });
});

describe('Log out', () => {
  it('Log out → API called, token cleared, login page shown', async () => {
    const { user, path } = renderApp('/', fakeToken());
    await editorHeading();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByText('You have logged out.')).toBeInTheDocument();
    expect(path()).toBe('/login');
    expect(calls.logout).toBe(1);
    expect(sessionStorage.getItem('backoffice.token')).toBeNull();
  });

  it('server unreachable on logout → still logged out locally', async () => {
    server.use(http.post(`${API}/api/auth/logout`, () => HttpResponse.error()));
    const { user, path } = renderApp('/', fakeToken());
    await editorHeading();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await screen.findByText('You have logged out.');
    expect(path()).toBe('/login');
  });
});

describe('Session end', () => {
  it('token expires while the editor is open → logged out automatically', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { path } = renderApp('/', fakeToken(60));
    await editorHeading();
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(await screen.findByText('Your session has ended. Please log in again.')).toBeInTheDocument();
    expect(path()).toBe('/login');
    expect(sessionStorage.getItem('backoffice.token')).toBeNull();
  });

  it('API returns 401 on save → sent to the login page', async () => {
    server.use(
      http.put(`${API}/api/home`, () =>
        HttpResponse.json({ statusCode: 401, error: 'invalid_token' }, { status: 401 }),
      ),
    );
    const { user, path } = renderApp('/', fakeToken());
    await editorHeading();
    await screen.findByDisplayValue('Welcome');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(path()).toBe('/login'));
    expect(screen.getByText('Your session has ended. Please log in again.')).toBeInTheDocument();
  });
});
