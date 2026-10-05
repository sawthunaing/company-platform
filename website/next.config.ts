import type { NextConfig } from 'next';

// The hero image is uploaded to the API and served from its /uploads/ path.
const api = new URL(process.env.API_URL || 'http://localhost:3000');
const apiIsLocal = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname);

const nextConfig: NextConfig = {
  // The e2e tests and the Lighthouse script build into their own folder so they never overwrite .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: api.protocol === 'https:' ? 'https' : 'http',
        hostname: api.hostname,
        port: api.port,
        pathname: '/uploads/**',
      },
    ],
    // Next.js refuses to optimise images from private addresses. Allow it only for a local dev API.
    dangerouslyAllowLocalIP: apiIsLocal,
  },
};

export default nextConfig;
