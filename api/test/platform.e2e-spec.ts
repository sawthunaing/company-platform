import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from './helpers';

describe('Health, CORS and docs', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('GET /health → 200 with database status', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('request from an allowed frontend → CORS header set', async () => {
    const res = await http().get('/api/home').set('Origin', 'http://admin.test').expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://admin.test');
  });

  it('request from any other origin → no CORS header', async () => {
    const res = await http().get('/api/home').set('Origin', 'http://evil.test');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('GET /docs → Swagger UI', async () => {
    const res = await http().get('/docs').expect(200);
    expect(res.text).toContain('swagger');
  });

  it('OpenAPI document lists the auth, content and health routes', async () => {
    const res = await http().get('/docs-json').expect(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/api/auth/login', '/api/auth/logout', '/api/home', '/health']),
    );
  });
});
