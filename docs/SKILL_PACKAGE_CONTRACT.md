# Skill Package Contract

This contract defines how CLI-like skill packages must be built so root `pnpm dev` remains stable for everyone.

## Scope

A package is treated as a skill package when it contains `SKILL.md`.

## Required Files

- `SKILL.md`
- `src/dev.ts`
- `.env.example`
- `package.json`

## Required Behaviors

1. `package.json` must point `scripts.dev` to `src/dev.ts`.
2. `src/dev.ts` must safely no-op with exit code 0 when no required command arguments are provided.
3. `src/dev.ts` should load package-local env files (`.env.local`, then `.env`) before delegating to the skill runtime.
4. `SKILL.md` must document local env setup using `.env.example` -> `.env.local`.
5. `.env.example` must contain placeholders only. Never commit real secrets.

## Why This Exists

- Root `pnpm dev` runs every package `dev` task via Turborepo.
- Skills that require private keys can otherwise break monorepo startup.
- Local, package-scoped env setup keeps credentials personal and avoids leaking root-level secrets.

## Validation

Repository check command:

```bash
pnpm check:skills
```

This command is also part of `pnpm lint` and CI quality checks.

## Templates

Use reusable templates in [docs/skills-template/](docs/skills-template):

- [docs/skills-template/package.json.snippet.json](docs/skills-template/package.json.snippet.json)
- [docs/skills-template/dev.ts](docs/skills-template/dev.ts)
- [docs/skills-template/.env.example](docs/skills-template/.env.example)
- [docs/skills-template/SKILL.md.template](docs/skills-template/SKILL.md.template)
