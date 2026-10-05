import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, login, resetAuth } from './helpers';

const validContent = {
  heroTitle: 'We build things',
  heroSubtitle: 'Fast and reliable.',
  sections: [
    { title: 'Services', body: 'Web and mobile.' },
    { title: 'About', body: 'Founded in 2026.' },
  ],
  contact: { email: 'hello@company.com', phone: '+44 20 0000 0000', address: 'London' },
};

describe('Content API', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createApp();
  });
  beforeEach(() => resetAuth(app));
  afterAll(() => app.close());

  it('GET /api/home with no token → 200 with content', async () => {
    const res = await http().get('/api/home').expect(200);
    expect(res.body).toMatchObject({
      heroTitle: expect.any(String),
      heroSubtitle: expect.any(String),
      sections: expect.any(Array),
      contact: expect.any(Object),
      updatedAt: expect.any(String),
    });
  });

  it('PUT /api/home with no token → 401', async () => {
    await http().put('/api/home').send(validContent).expect(401);
  });

  it('PUT /api/home with an invalid token → 401', async () => {
    await http().put('/api/home').set('Authorization', 'Bearer not-a-token').send(validContent).expect(401);
  });

  it('PUT /api/home with a staff token → content updated', async () => {
    const token = await login(app);
    await http().put('/api/home').set('Authorization', `Bearer ${token}`).send(validContent).expect(200);
    const res = await http().get('/api/home').expect(200);
    expect(res.body).toMatchObject(validContent);
  });

  it('PUT /api/home with a logged-out token → 401', async () => {
    const token = await login(app);
    await http().post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
    await http().put('/api/home').set('Authorization', `Bearer ${token}`).send(validContent).expect(401);
  });

  it.each([
    ['empty hero title', { ...validContent, heroTitle: '' }],
    ['section without a title', { ...validContent, sections: [{ title: '', body: 'x' }] }],
    ['bad contact email', { ...validContent, contact: { email: 'nope' } }],
    ['unknown field', { ...validContent, extra: true }],
    ['missing sections', { heroTitle: 'x', heroSubtitle: 'y', contact: {} }],
  ])('PUT /api/home with %s → 400', async (_name, body) => {
    const token = await login(app);
    await http().put('/api/home').set('Authorization', `Bearer ${token}`).send(body).expect(400);
  });
});
