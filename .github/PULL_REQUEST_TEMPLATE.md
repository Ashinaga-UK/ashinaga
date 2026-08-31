## Summary

-

## PR Checklist (Skills)

- [ ] If this PR adds or changes a skill package (`packages/*` with `SKILL.md`), `scripts.dev` points to `src/dev.ts` (non-blocking in root `pnpm dev`).
- [ ] Skill wrapper behavior verified:
  - [ ] No args => exits `0` with skip message
  - [ ] With args => runs intended skill logic
- [ ] `.env.example` exists in the skill package and contains placeholders only (no real secrets).
- [ ] `SKILL.md` documents `.env.example` -> `.env.local` setup and required env vars.
- [ ] `pnpm check:skills` passes locally.
- [ ] `pnpm check:migrations` passes locally (journal `when` strictly increasing, except the allowlisted `0017_new_redwing` inversion).
- [ ] `pnpm lint` passes locally.
- [ ] Root `pnpm dev` does not fail because of this skill package (any remaining failures are unrelated and noted below).

## Validation Notes

- `pnpm check:skills`:
- `pnpm check:migrations`:
- `pnpm lint`:
- `pnpm dev` (root) outcome:
- Any unrelated blockers (ports/services/etc.):
