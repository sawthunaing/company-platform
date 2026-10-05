import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, login, resetAuth } from './helpers';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(100)]);
const PDF = Buffer.from('%PDF-1.7\n' + 'x'.repeat(100));
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe('Hero image upload', () => {
  let app: INestApplication;
  let token: string;
  const http = () => request(app.getHttpServer());
  const upload = (data: Buffer, filename: string, contentType: string) =>
    http()
      .post('/api/uploads/hero')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', data, { filename, contentType });

  beforeAll(async () => {
    app = await createApp();
  });
  beforeEach(async () => {
    await resetAuth(app);
    token = await login(app);
  });
  afterAll(() => app.close());

  it('no token → 401', async () => {
    await http().post('/api/uploads/hero').attach('file', PNG, 'hero.png').expect(401);
  });

  it.each([
    ['PNG', PNG, 'png'],
    ['JPEG', JPEG, 'jpg'],
    ['WebP', WEBP, 'webp'],
  ])('%s → 201 with a URL that serves the file', async (_name, data, ext) => {
    const res = await upload(data, `hero.${ext}`, 'application/octet-stream').expect(201);
    expect(res.body.url).toMatch(new RegExp(`^/uploads/[0-9a-f-]{36}\\.${ext}$`));
    const file = await http().get(res.body.url).expect(200);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(file.body, data)).toBe(0);
  });

  it('file over 2 MB → 413 file_too_large', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await upload(big, 'big.png', 'image/png').expect(413);
    expect(res.body.error).toBe('file_too_large');
  });

  it('PDF → 415 unsupported_type', async () => {
    const res = await upload(PDF, 'doc.pdf', 'application/pdf').expect(415);
    expect(res.body.error).toBe('unsupported_type');
  });

  it('PDF renamed to .png with an image content type → 415', async () => {
    await upload(PDF, 'fake.png', 'image/png').expect(415);
  });

  it('SVG → 415', async () => {
    await upload(SVG, 'logo.svg', 'image/svg+xml').expect(415);
  });

  it('no file → 400 file_required', async () => {
    const res = await http().post('/api/uploads/hero').set('Authorization', `Bearer ${token}`).expect(400);
    expect(res.body.error).toBe('file_required');
  });
});
