import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { HomeContentResponse } from '../src/api/types';

export const API = 'http://localhost:3000';
export const PASSWORD = 'correct-password';

// A JWT with only the claims the app reads. The API checks the signature, not the app.
export function fakeToken(expiresInSeconds = 3600): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', email: 'staff@company.com', exp })}.sig`;
}

export const sampleContent = (): HomeContentResponse => ({
  heroTitle: 'Welcome',
  heroSubtitle: 'We build things.',
  sections: [
    { title: 'Services', body: 'Web apps.' },
    { title: 'About', body: 'Since 2026.' },
  ],
  contact: { email: 'hello@company.com' },
  updatedAt: '2026-10-05T00:00:00.000Z',
});

// Records what the app sent, so tests can check the requests.
export const calls = { put: [] as unknown[], logout: 0, uploads: 0 };

export const handlers = [
  http.post(`${API}/api/auth/login`, async ({ request }) => {
    const { password } = (await request.json()) as { password: string };
    if (password !== PASSWORD) {
      return HttpResponse.json({ statusCode: 401, error: 'invalid_credentials', message: 'Wrong email or password.' }, { status: 401 });
    }
    return HttpResponse.json({ accessToken: fakeToken(), expiresIn: 3600 });
  }),
  http.post(`${API}/api/auth/logout`, () => {
    calls.logout++;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/api/home`, () => HttpResponse.json(sampleContent())),
  http.put(`${API}/api/home`, async ({ request }) => {
    const body = (await request.json()) as object;
    calls.put.push(body);
    return HttpResponse.json({ ...body, updatedAt: new Date().toISOString() });
  }),
  http.post(`${API}/api/uploads/hero`, () => {
    calls.uploads++;
    return HttpResponse.json({ url: '/uploads/abc.png' }, { status: 201 });
  }),
];

export const server = setupServer(...handlers);

export function resetCalls() {
  calls.put = [];
  calls.logout = 0;
  calls.uploads = 0;
}
