export const API = process.env.E2E_API_URL ?? 'http://localhost:3000';
export const STAFF_EMAIL = 'e2e-staff@company.com';
export const STAFF_PASSWORD = 'e2e-password-0123456789';

// A real 1×1 PNG, so the API's content check accepts it and the browser can draw it.
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
