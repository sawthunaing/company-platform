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

## API tests

Needs Docker (the tests start their own Postgres).

```sh
cd api
npm install
npm test
```
