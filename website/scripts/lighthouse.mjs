// Mobile Lighthouse run against a production build that reads the mock API.
// Runs Lighthouse 3 times and takes the median of each score, because Performance
// varies from run to run. Fails when Performance, Accessibility or SEO is below 90.
// Reports go to website/lighthouse/.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { startMockApi } from '../e2e/mock-api.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NEXT_BIN = createRequire(import.meta.url).resolve('next/dist/bin/next');
const SITE_PORT = 3102;
const API_PORT = 3997;
const CONTROL_PORT = 3996;
const RUNS = 3;
const MIN_SCORE = 0.9;
const CATEGORIES = ['performance', 'accessibility', 'seo'];

const env = {
  ...process.env,
  API_URL: `http://localhost:${API_PORT}`,
  SITE_URL: `http://localhost:${SITE_PORT}`,
  NEXT_DIST_DIR: '.next-lighthouse',
};

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [NEXT_BIN, ...args], { cwd: ROOT, env, stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`next ${args[0]} exited with ${code}`))));
  });
}

async function waitFor(url, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not start`);
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const mock = await startMockApi({ apiPort: API_PORT, controlPort: CONTROL_PORT });
let server;
let chrome;
try {
  await run(['build']);
  server = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(SITE_PORT)], { cwd: ROOT, env, stdio: 'ignore' });
  const url = `http://localhost:${SITE_PORT}/`;
  await waitFor(url);
  await fetch(url); // warm the image optimiser and page cache, as a visitor after the first would see

  chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new'] });
  const outDir = join(ROOT, 'lighthouse');
  await mkdir(outDir, { recursive: true });

  const scores = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (let i = 1; i <= RUNS; i++) {
    // Default config: mobile form factor, simulated slow 4G and 4× CPU slowdown.
    const result = await lighthouse(url, { port: chrome.port, onlyCategories: CATEGORIES, output: 'html', logLevel: 'error' });
    await writeFile(join(outDir, `report-${i}.html`), result.report);
    const line = CATEGORIES.map((c) => {
      scores[c].push(result.lhr.categories[c].score);
      return `${c} ${Math.round(result.lhr.categories[c].score * 100)}`;
    });
    console.log(`run ${i}: ${line.join(', ')}`);
  }

  const failed = [];
  for (const c of CATEGORIES) {
    const score = median(scores[c]);
    console.log(`${c}: ${Math.round(score * 100)} (median of ${RUNS})`);
    if (score < MIN_SCORE) failed.push(c);
  }
  console.log(`reports: ${outDir}`);
  if (failed.length) {
    console.error(`below ${MIN_SCORE * 100}: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
} finally {
  await chrome?.kill();
  server?.kill();
  await mock.close();
}
