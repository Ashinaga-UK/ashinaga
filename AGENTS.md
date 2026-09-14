# AGENTS.md

## Cursor Cloud specific instructions

This is a Turborepo + pnpm monorepo (`pnpm@10.15.1`, Node `>=18`). The standard commands in `README.md`, `CLAUDE.md`, and the per-app `package.json` scripts are accurate — use them. The notes below only cover non-obvious, environment-specific caveats for running things in the Cloud VM.

### Services (dev mode)

| Service | Dir | Dev command | Port |
| --- | --- | --- | --- |
| API (NestJS + Fastify) | `apps/api` | `pnpm dev` | 4000 (Swagger at `/api`, health at `/health`) |
| Staff portal (Next.js) | `apps/staff` | `pnpm dev` | 4001 |
| Scholar portal (Next.js) | `apps/scholar` | `pnpm dev` | 4002 |
| Storybook | `packages/ui` | `pnpm dev` | 6006 |
| Postgres | (docker) | `pnpm dev:db` | host 5433 → container 5432 |

The API requires Postgres to be up.

### Docker

Cursor Cloud snapshots may already have Docker installed, but `dockerd` is **not** running on boot, and some snapshots have no Docker at all. `pnpm dev` depends on `docker compose` to start Postgres, so the daemon must be up and your user must be in the `docker` group.

Cloud Agents run `./scripts/_docker_install.sh` automatically from `.cursor/environment.json` (`install` bakes Docker into the Build; `start` brings `dockerd` up for the session). If Docker is not already healthy, run the same idempotent helper yourself:

```bash
./scripts/_docker_install.sh
```

That script:

- exits immediately when Docker is already healthy (does not `pkill` a running daemon)
- installs Docker CE when `dockerd` is missing
- starts `dockerd` when it is installed but not running
- adds your user to the `docker` group so `docker compose` works without sudo

The VM has no systemd, so `systemctl start docker` will fail — use the script rather than trying to manage the daemon through systemd.

Do **not** `chmod 666 /var/run/docker.sock`. A world-writable Docker socket is root-equivalent for every process on the VM. If `docker` reports a permission error after a fresh boot, re-run `./scripts/_docker_install.sh` and start a new shell so the `docker` group membership applies.

After Docker is up: `pnpm dev:db` (or `docker compose up -d postgres`). Postgres 17.5 is published on host port **5433** (not 5432). See `docker-compose.yml`.

### Env files

- `.env` files are gitignored. Create them once from the examples: copy `apps/api/.env.example` → `apps/api/.env` (and the same for `staff`/`scholar`). The example values already point at the local Postgres (`DB_PORT=5433`) and a valid dev `BETTER_AUTH_SECRET` (must be at least 32 chars).
- Optional integrations (Resend email, AWS S3 uploads, Microsoft SSO) are unset by default; core flows work without them — password-reset links are logged to the API console instead of emailed.

### Running everything

- `pnpm dev` runs all apps + Storybook in parallel. Turbo's `dev` task depends on `migrate` → `docker`, so it runs `docker compose up -d` and Drizzle migrations automatically — but only after `dockerd` is already running (see above).
- Root `pnpm dev` uses Turbo's `tui` UI, which needs a TTY. In headless sessions it is more reliable to start Postgres once (`pnpm dev:db`), then run each app's `pnpm dev` in its own tmux session. Both NestJS and Next.js hot-reload on source changes.

### Database: migrations and seed data

- Apply schema: `pnpm db:migrate` (root) → `drizzle-kit migrate` in `apps/api`. Uses individual `DB_*` vars, **not** a single `DATABASE_URL`. Generate with `pnpm db:generate`.
- Seed demo data: `apps/api` script `pnpm db:populate-dev` is **interactive** (prompts on stdin for a staff invitation email). Run it non-interactively with `echo "" | pnpm db:populate-dev` to skip the prompt, or pipe an address in: `echo "admin@ashinaga.dev" | pnpm db:populate-dev`. It is idempotent (upserts) and creates 30 demo scholars plus tasks/goals/announcements/requests.
- The Better Auth user table is named `user` (singular) and uses snake_case columns (e.g. `user_type`, `email_verified`).

### Auth / how to log in

Signup requires a **valid, pending invitation row** in the `invitations` table for that email, enforced by a Better Auth `signUp.before` hook — `/api/auth/sign-up/email` rejects emails without one. Seeded users have **no password**; Better Auth sets passwords only at signup, so invitation → signup → login is the real onboarding flow.

To get into the staff portal: seed an invitation for your email (the `db:populate-dev` prompt creates a staff invite), then register at `http://localhost:4001/signup` with that exact email and a password (min 8 chars).

Note: when `NODE_ENV=test`, the invitation check is bypassed entirely and `@ashinaga.org` addresses are given the `staff` role automatically (`apps/api/src/auth/auth.config.ts`).

### Lint caveat

- CI's authoritative lint is `pnpm lint`, which runs `check:skills` → `check:migrations` → `test:migrations` → `turbo run check`. `pnpm check` is Biome only and does **not** run the Drizzle journal guard.
- No package defines a `check` task, so `turbo run check` executes 0 tasks and passes trivially. The real Biome lint of source is the root `pnpm check` (`biome check .`); the per-app `lint` scripts use `biome check --write` to auto-fix.
- Running `pnpm check` on a fresh checkout reports pre-existing warnings/errors that are not from your changes.
- A Husky `pre-commit` hook runs `pnpm check:fix`, and `.claude/settings.json` registers a `PostToolUse` hook that runs `pnpm format` after edits.

### Tests / build

- `pnpm test` (Jest across api/staff/scholar), `pnpm build` (Turbo, builds packages before apps).
- API integration and e2e are separate: `pnpm test:integration`, `pnpm test:e2e`. Integration tests need Postgres on 5433.
