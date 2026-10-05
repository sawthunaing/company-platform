import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Starts a throwaway Postgres for the test run. Needs Docker.
export default async function globalSetup() {
  const pg = await new PostgreSqlContainer('postgres:17-alpine').start();
  (globalThis as any).__PG__ = pg;
  process.env.DATABASE_URL = pg.getConnectionUri();
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
  process.env.CORS_ORIGINS = 'http://admin.test,http://www.test';
  process.env.LOG_LEVEL = 'silent';
  process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'uploads-'));
}
