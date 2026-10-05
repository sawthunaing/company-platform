// Server-side settings. See .env.example.
const trimSlash = (url: string) => url.replace(/\/+$/, '');

export const API_URL = trimSlash(process.env.API_URL || 'http://localhost:3000');
export const SITE_URL = trimSlash(process.env.SITE_URL || 'http://localhost:3001');
