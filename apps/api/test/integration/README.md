# Integration tests

These tests call real HTTP endpoints against a running Nest app and a real PostgreSQL database. They verify that the API and persistence work together end-to-end.

## Running locally

1. Start Postgres (e.g. `pnpm docker` from repo root or `docker compose up -d` in `apps/api` if you have a compose file there; or use `db:migrate` which starts docker).
2. Set env if needed (defaults: `DB_HOST=localhost`, `DB_PORT=5433`, `DB_USER=postgres`, `DB_PASSWORD=postgres`, `DB_NAME=postgres`).
3. From `apps/api`: `pnpm test:integration`.

## CI

The GitHub Actions workflow **Integration Tests** runs these tests with a Postgres service (`DB_PORT=5432`, `DB_NAME=ashinaga_integration`).

## Adding tests

- Add new `*.integration.spec.ts` files under `test/integration/`.
- Use `createIntegrationApp()` from `helpers/create-app.ts` to get a Nest app instance.
- Seed data in `beforeAll` via Drizzle against the same DB the app uses; clean up in `afterAll`.
