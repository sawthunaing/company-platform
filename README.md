# Company Platform

The backend API, backoffice and website for the company site.

## Run locally

Needs Docker.

```sh
docker compose up --build
```

- API: http://localhost:3000
- API docs: http://localhost:3000/docs
- Health: http://localhost:3000/health

The defaults in `compose.yaml` work without a `.env`. To change them, copy `.env.example` to `.env`.

## Create a staff user

```sh
docker compose exec api npm run staff:create -- staff@company.com 'a-long-password'
```

Running it again for the same email resets the password.

## Website

The public home page. It reads its content from `GET /api/home` and refreshes it at most once a minute (ISR). If the API is down, it keeps showing the last page it built. Start the API first (`docker compose up`), then:

```sh
cd website
npm install
npm run build
npm start
```

Open http://localhost:3001. Use `npm run build` and `npm start`, not `npm run dev`, to see the one-minute refresh: dev mode reloads the content on every request. To use another API or site address, copy `website/.env.example` to `website/.env.local`.

Website tests need no Docker. The end-to-end tests and the Lighthouse check build the site against a mock API that they can change and stop:

```sh
cd website
npm test
npx playwright install chromium
npm run e2e
npm run lighthouse
```

`npm run e2e` takes about 3 minutes: two tests wait out the 60-second refresh. `npm run lighthouse` runs a mobile audit 3 times and fails when the median Performance, Accessibility or SEO score is below 90. Its reports go to `website/lighthouse/`.

## Production

One server runs everything with Docker Compose (`deploy/compose.prod.yaml`). Caddy serves `www.<domain>` (website), `admin.<domain>` (backoffice) and `api.<domain>` (API) over HTTPS with Let's Encrypt certificates.

- **Deploys:** every merge to `main` runs all tests (`.github/workflows/ci.yml`), builds the images into GHCR, then runs `deploy/deploy.sh <commit>` on the server. If any test fails, nothing is deployed. If the new version does not become healthy, `deploy.sh` rolls back to the previous one.
- **Backups:** the `backup` service dumps the database and the uploaded images daily at 02:00, keeps 7 days, and can copy them off the server.
- **Secrets:** they live only in `/opt/company-platform/.env` on the server. See `deploy/.env.example` for the variables. CI runs gitleaks on every pull request.

The runbook (server setup, deploy, rollback, restore) is the S-4 engineering document in DoneWhen.

Test the production stack locally (needs Docker and free ports 80 and 443):

```sh
deploy/test/smoke.sh            # the whole stack over HTTPS with local certificates, plus a rollback
deploy/test/backup-restore.sh   # backup, 7-day cleanup, restore into a fresh database
```

## Backoffice

The staff app for editing the home page. Start the API first (`docker compose up`), then:

```sh
cd backoffice
npm install
npm run dev
```

Open http://localhost:5173 and log in with a staff user. To use another API, copy `backoffice/.env.example` to `backoffice/.env.local`.

## Tests

API tests need Docker (they start their own Postgres):

```sh
npm test --prefix api
```

Backoffice unit tests (no API needed):

```sh
npm test --prefix backoffice
```

Backoffice end-to-end tests run in a real browser against the running API. They create the user `e2e-staff@company.com` and restore the home content afterwards:

```sh
docker compose up -d --build
npx --prefix backoffice playwright install chromium
npm run e2e --prefix backoffice
```
