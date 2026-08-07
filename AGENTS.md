# AGENTS.md

## Cursor Cloud specific instructions

This is a Turborepo + pnpm monorepo. The standard commands in `README.md`, `CLAUDE.md`, and the per-app `package.json` scripts are accurate — use them. The notes below only cover non-obvious, environment-specific caveats for running things in the Cloud VM.

### Services (dev mode)
- `apps/api` — NestJS (Fastify) API on `http://localhost:4000` (Swagger at `/api`, health at `/health`). Requires Postgres.
- `apps/staff` — Next.js staff portal on `http://localhost:4001`.
- `apps/scholar` — Next.js scholar portal on `http://localhost:4002`.
- `packages/ui` — Storybook on `http://localhost:6006`.

Note: `README.md`/`docs` mention ports 3000/3001/3002, but the actual dev ports are **4000/4001/4002** (see `apps/*/package.json` and `apps/api/.env.example`).

### Postgres runs in Docker (must be started manually)
- Postgres 17.5 runs via `docker compose up -d postgres` and is published on host port **5433** (not 5432). See `docker-compose.yml`.
- Docker is pre-installed in the VM snapshot, but `dockerd` is **not** running on boot. Start it once per session:
  - `sudo bash -c 'nohup dockerd > /tmp/dockerd.log 2>&1 &'` then `sudo chmod 666 /var/run/docker.sock` so `docker` works without sudo (Turbo's `pnpm dev` calls `docker compose` directly).
- After Docker is up: `pnpm dev:db` (or `docker compose up -d postgres`).

### Env files
- `.env` files are gitignored. Create them once from the examples: copy `apps/api/.env.example` → `apps/api/.env` (and the same for `staff`/`scholar`). The example values already point at the local Postgres (`DB_PORT=5433`) and a valid dev `BETTER_AUTH_SECRET`.

### Running everything
- `pnpm dev` runs all apps + Storybook in parallel. Turbo's `dev` task depends on `migrate` → `docker`, so it runs `docker compose up -d` and Drizzle migrations automatically — but only after `dockerd` is already running (see above).
- Migrations: `pnpm db:migrate` (Drizzle). Generate with `pnpm db:generate`.

### Seed / test data (non-obvious)
- `apps/api` seed script `pnpm db:populate-dev` is **interactive** (prompts for a staff invitation email via stdin). Run it non-interactively with `echo "" | pnpm db:populate-dev` to skip the prompt. It is idempotent (upserts) and creates 30 demo scholars plus tasks/goals/announcements/requests.
- Seeded users have **no password** — Better Auth sets passwords only at signup. To get a usable staff login you must first insert a `pending` staff `invitation` row for the email, then sign up (invitation → signup → login is the real onboarding flow; `/api/auth/sign-up/email` rejects emails without an invitation).

### Lint caveat
- CI's authoritative lint is `pnpm lint` (runs `check:skills` + `turbo run check`). The packages don't define a `check` task, so Biome linting of source is effectively driven by the root `pnpm check` (`biome check .`), and the per-app `lint` scripts use `biome check --write` to auto-fix. Running `pnpm check` on a fresh checkout reports pre-existing warnings/errors that are not from your changes.
- `.claude/settings.json` registers a `PostToolUse` hook that runs `pnpm format` (Biome) after edits.

### Tests / build
- `pnpm test` (Jest across api/staff/scholar), `pnpm build` (Turbo, builds packages before apps). API integration/e2e are separate: `pnpm test:integration`, `pnpm test:e2e`.
