---
name: flow-coverage
description: Use when a change adds or changes a product flow (a staff/scholar page route, sidebar/nav item, scholar-profile tab, or /api/ controller route) or when the "Flow coverage" check fails. Decides whether tests must land in the same PR and which suite to add them to. Not for docs, copy, styling or infra-only changes.
---

# Flow coverage (ASH-123)

When the product grows, the tests grow **in the same PR**. Everyday changes stay as they are.

## When the check fires (and when it stays silent)

`pnpm check:flow-coverage` (CI: **Flow coverage** workflow on PRs into `test`/`main`) diffs the
branch against its base and flags only:

| Signal | Resolved against |
|---|---|
| New `apps/{staff,scholar}/app/**/page.tsx` route | flow catalogue route |
| New staff sidebar section (`staff-layout.tsx` `value: '…'`) | `/?tab=…` flows |
| New student nav item (`scholar-layout.tsx` `href: '…'`) | student flows by route |
| New scholar-profile tab (`<TabsTrigger value="…">`) | `scholarTab=…` flows |
| New `/api/` route (`@Get/@Post/@Put/@Patch/@Delete`) | any spec calling `.handler(` or the route path |

It stays **silent** on docs, copy, styling, infra and Biome/formatting-only diffs (a moved or
reformatted line cancels out), and on changes to flows that already have a spec.

The flow list is the ASH-122 catalogue, `packages/qa-skill/catalogue/flows.json`: one list, same
flow IDs. Each flow has `specs` (files that cover it) or an explicit `specSkip` reason.

## What to do when it fires

1. **Not in the catalogue?** Add a flow for the new page/nav/tab to `flows.json` (ID, route,
   persona, stage, steps, expected). The QA skill will now walk it too.
2. **Add the cheapest test that proves the behaviour**, in this order:
   - API route or write path → controller/service unit spec (`apps/api/src/**/x.spec.ts`) or an API
     integration spec (`apps/api/test/integration`) that calls it.
   - UI page/nav/tab → a Jest component or page test (`apps/<app>/components/__tests__`,
     `app/**/page.test.tsx`).
   - Playwright (`apps/<app>/test/e2e`) **only** for a user-visible flow the e2e smoke does not
     already cover. Never copy the whole QA catalogue into Playwright.
3. List the new spec under that flow's `specs` in `flows.json`.
4. Only if a test genuinely can't land now: set `specSkip` on the flow (or add the route to
   `apiCoverageExceptions`) with a reason a reviewer can judge. A follow-up ticket should be named
   in the reason.

Run locally before pushing:

```bash
pnpm check:flow-coverage                 # compares with origin/test
pnpm check:flow-coverage -- --base origin/main
pnpm test:flow-coverage                  # the detector's own tests
```

This does not replace `pnpm test`, `test:integration` or `test:e2e`, and it never runs the full QA
skill. For a full walkthrough use the `qa-walkthrough` skill.
