import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { API, STAFF_EMAIL, STAFF_PASSWORD } from './env';

// Checks the API is up and creates (or resets) the e2e staff user in the Compose stack.
export default async function globalSetup() {
  const health = await fetch(`${API}/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(`API not reachable at ${API}/health. Start it first: docker compose up -d --build (repo root).`);
  }
  execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'api', 'npm', 'run', '-s', 'staff:create', '--', STAFF_EMAIL, STAFF_PASSWORD],
    { cwd: resolve(import.meta.dirname, '..', '..'), stdio: 'inherit' },
  );
}
