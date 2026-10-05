import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createApp, login, resetAuth, STAFF_EMAIL, STAFF_PASSWORD } from './helpers';

describe('Staff auth', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const loginAs = (email: string, password: string) => http().post('/api/auth/login').send({ email, password });

  beforeAll(async () => {
    app = await createApp();
  });
  beforeEach(() => resetAuth(app));
  afterAll(() => app.close());

  it('correct email and password → 200 with token', async () => {
    const res = await loginAs(STAFF_EMAIL, STAFF_PASSWORD).expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.expiresIn).toBe(3600);
  });

  it('email is matched case-insensitively', async () => {
    await loginAs('Staff@Company.com', STAFF_PASSWORD).expect(200);
  });

  it('wrong password → 401', async () => {
    const res = await loginAs(STAFF_EMAIL, 'wrong-password').expect(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('unknown email → 401', async () => {
    await loginAs('nobody@company.com', STAFF_PASSWORD).expect(401);
  });

  it('invalid body → 400', async () => {
    await loginAs('not-an-email', STAFF_PASSWORD).expect(400);
  });

  it('5 failed tries in 15 min → 6th try is 429, even with the right password', async () => {
    for (let i = 0; i < 5; i++) await loginAs(STAFF_EMAIL, 'wrong-password').expect(401);
    const res = await loginAs(STAFF_EMAIL, STAFF_PASSWORD).expect(429);
    expect(res.body.error).toBe('too_many_attempts');
  });

  it('failed tries older than 15 min do not count', async () => {
    await app
      .get(DataSource)
      .query(
        `INSERT INTO login_attempts (email, attempted_at) SELECT $1, now() - interval '16 minutes' FROM generate_series(1, 5)`,
        [STAFF_EMAIL],
      );
    await loginAs(STAFF_EMAIL, STAFF_PASSWORD).expect(200);
  });

  it('a successful login clears earlier failed tries', async () => {
    for (let i = 0; i < 4; i++) await loginAs(STAFF_EMAIL, 'wrong-password').expect(401);
    await loginAs(STAFF_EMAIL, STAFF_PASSWORD).expect(200);
    for (let i = 0; i < 4; i++) await loginAs(STAFF_EMAIL, 'wrong-password').expect(401);
    await loginAs(STAFF_EMAIL, STAFF_PASSWORD).expect(200);
  });

  it('logout → 204, then the token is no longer accepted', async () => {
    const token = await login(app);
    await http().post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
    const res = await http().post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('logout without a token → 401', async () => {
    await http().post('/api/auth/logout').expect(401);
  });
});
