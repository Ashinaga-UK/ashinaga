# AGENTS.md

## Cursor Cloud specific instructions

This is a Turborepo monorepo (`pnpm@10.15.1`, Node `>=18`) with three runtime services plus shared packages. Standard commands live in `README.md`, `CLAUDE.md`, and each package's `package.json`; this section only records non-obvious cloud/startup caveats.

### Services and ports (actual dev ports)

| Service | Dir | Dev command | Port |
| --- | --- | --- | --- |
| API (NestJS + Fastify) | `apps/api` | `pnpm dev` | 4000 (Swagger at `/api`, health at `/health`) |
| Staff portal (Next.js) | `apps/staff` | `pnpm dev` | 4001 |
| Scholar portal (Next.js) | `apps/scholar` | `pnpm dev` | 4002 |
| Postgres | (docker) | `pnpm dev:db` | host 5433 → container 5432 |

Note: some docs (`README.md`, `docs/getting-started.md`, `apps/api/README.md`, `CLAUDE.md`) mention ports 3000/3001/3002 — those are stale. The real ports come from the `.env` files / package scripts and are 4000/4001/4002 (Postgres on 5433).

### Docker daemon must be started manually (no systemd)

The VM has no systemd, so `systemctl start docker` fails. Docker (with `fuse-overlayfs` storage driver + `iptables-legacy`, and `containerd-snapshotter` disabled for Docker 29) is already installed/configured. Start the daemon once per boot in a tmux session, e.g. `sudo dockerd` (leave it running), then bring up Postgres with `pnpm dev:db` (or `docker compose up -d postgres`). The `ubuntu` user is in the `docker` group; if `docker` still reports a permission error after a fresh boot, run `sudo chmod 666 /var/run/docker.sock`.

### Environment files

`apps/api/.env`, `apps/staff/.env`, `apps/scholar/.env` are gitignored and are created from the committed `.env.example` files in each app. `BETTER_AUTH_SECRET` in `apps/api/.env` must be at least 32 chars. Optional integrations (Resend email, AWS S3 uploads, Microsoft SSO) are unset by default; core flows work without them (password-reset links are logged to the API console instead of emailed).

### Database: migrations and seed data

- Apply schema: `pnpm db:migrate` (root) → `drizzle-kit migrate` in `apps/api`. Uses individual `DB_*` vars, not a single `DATABASE_URL`.
- Seed demo data: `cd apps/api && pnpm db:populate-dev`. This script is idempotent but **prompts on stdin** for a staff-invitation email — in a non-interactive shell pipe one in, e.g. `echo "admin@ashinaga.dev" | pnpm db:populate-dev`. It seeds 30 demo scholars plus tasks/goals/announcements/requests.
- The Better Auth user table is named `user` (singular) and uses snake_case columns (e.g. `user_type`, `email_verified`).

### Auth / how to log in

Signup requires a **valid, pending invitation row** in the `invitations` table for that email (enforced by a Better Auth `signUp.before` hook). To get into the staff portal: seed an invitation for your email (the `db:populate-dev` prompt creates a staff invite), then go to `http://localhost:4001/signup` and register with that exact email and a password (min 8 chars). Passwords are not seeded; every account is created via signup. (In `NODE_ENV=test`, the invitation check is bypassed and `@ashinaga.org` emails become staff.)

### Lint caveat

`pnpm lint` runs `pnpm check:skills && turbo run check`, but no package defines a `check` task, so `turbo run check` executes 0 tasks and passes trivially. The real Biome lint is the root `pnpm check` (`biome check .`). As of setup it reports pre-existing errors/warnings in committed source; auto-fixable ones are handled by the Husky `pre-commit` hook (`pnpm check:fix`).

### Running the apps in a headless session

Root `pnpm dev` uses Turbo's `tui` UI (needs a TTY) and chains `docker` → `migrate` → `dev`. In headless cloud sessions it is more reliable to start Postgres once (`pnpm dev:db`), then run each app's `pnpm dev` in its own tmux session. NestJS (`apps/api`) and Next.js dev servers hot-reload on source changes.
