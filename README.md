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
