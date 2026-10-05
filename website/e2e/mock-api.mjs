// A stand-in for GET /api/home that the tests can change and switch off.
// The API listens on MOCK_API_PORT; a control server on MOCK_CONTROL_PORT changes it:
//   PUT  /content   replace the content        POST /down   stop the API (connections refused)
//   GET  /content   read the content           POST /up     start it again
//   POST /reset     back to the default content, API up
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const MOCK_API_PORT = Number(process.env.MOCK_API_PORT || 3999);
export const MOCK_CONTROL_PORT = Number(process.env.MOCK_CONTROL_PORT || 3998);

export const DEFAULT_CONTENT = {
  heroTitle: 'Northwind Consulting',
  heroSubtitle: 'Engineering teams that ship on time, every time.',
  heroImageUrl: '/uploads/hero.jpg',
  sections: [
    { title: 'Cloud migration', body: 'We move your systems to the cloud with no downtime and a clear plan.' },
    { title: 'Product engineering', body: 'Web and mobile products built by small senior teams.' },
    { title: 'Support', body: 'An around-the-clock help desk that answers within the hour.' },
    { title: 'About', body: 'Founded in 2010 in Leeds, we have shipped over 300 projects for clients across Europe.' },
  ],
  contact: { email: 'hello@northwind.example', phone: '+44 20 7946 0000', address: '1 High Street, Leeds LS1 1AA' },
};

export async function startMockApi({ apiPort = MOCK_API_PORT, controlPort = MOCK_CONTROL_PORT } = {}) {
  let content = structuredClone(DEFAULT_CONTENT);
  let updatedAt = new Date().toISOString();
  const heroJpeg = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: { r: 31, g: 78, b: 121 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  const sockets = new Set();
  const api = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/api/home') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...content, updatedAt }));
    } else if (req.method === 'GET' && req.url === '/uploads/hero.jpg') {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': heroJpeg.length });
      res.end(heroJpeg);
    } else {
      res.writeHead(404).end();
    }
  });
  api.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });

  const listen = () => new Promise((resolve) => api.listen(apiPort, resolve));
  const stop = () =>
    new Promise((resolve) => {
      if (!api.listening) return resolve();
      api.close(() => resolve());
      for (const s of sockets) s.destroy();
    });

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

  const control = http.createServer(async (req, res) => {
    const ok = (body = {}) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === 'GET' && req.url === '/health') return ok({ up: api.listening });
      if (req.method === 'GET' && req.url === '/content') return ok(content);
      if (req.method === 'PUT' && req.url === '/content') {
        content = JSON.parse(await readBody(req));
        updatedAt = new Date().toISOString();
        return ok(content);
      }
      if (req.method === 'POST' && req.url === '/down') {
        await stop();
        return ok({ up: false });
      }
      if (req.method === 'POST' && req.url === '/up') {
        if (!api.listening) await listen();
        return ok({ up: true });
      }
      if (req.method === 'POST' && req.url === '/reset') {
        content = structuredClone(DEFAULT_CONTENT);
        updatedAt = new Date().toISOString();
        if (!api.listening) await listen();
        return ok(content);
      }
      res.writeHead(404).end();
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });

  await listen();
  await new Promise((resolve) => control.listen(controlPort, resolve));

  return {
    close: async () => {
      await stop();
      await new Promise((resolve) => control.close(() => resolve()));
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startMockApi();
  console.log(`mock API on :${MOCK_API_PORT}, control on :${MOCK_CONTROL_PORT}`);
}
