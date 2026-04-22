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
- [ ] `pnpm lint` passes locally.
- [ ] Root `pnpm dev` does not fail because of this skill package (any remaining failures are unrelated and noted below).

## Validation Notes

- `pnpm check:skills`:
- `pnpm lint`:
- `pnpm dev` (root) outcome:
- Any unrelated blockers (ports/services/etc.):
