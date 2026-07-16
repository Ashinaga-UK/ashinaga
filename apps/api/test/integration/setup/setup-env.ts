/**
 * Runs BEFORE the test file (and therefore the app module) is imported.
 *
 * Jest forces `NODE_ENV='test'`, which makes the app's DB pool (`src/db/connection.ts`)
 * request an SSL connection. The local/dev and CI service Postgres instances do not
 * support SSL, so every app query would fail with "The server does not support SSL
 * connections". The app's connection honors `DB_SSL`, so we default it to `false`
 * here (unless explicitly overridden) to keep integration tests working locally and in CI.
 *
 * `setupFiles` (not `setupFilesAfterEnv`) is required because the app module reads
 * `process.env` at import time, before the test code executes.
 */
if (process.env.DB_SSL === undefined) {
  process.env.DB_SSL = 'false';
}
