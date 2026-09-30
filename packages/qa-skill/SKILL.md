---
name: qa-walkthrough
description: On-demand QA walk of every staff and student (Prep Year + enrolled scholar) flow on test or local. Produces a Pass / Fail / Skip row per flow from the flow catalogue. Use when asked to "QA the app", "run the QA skill", or check the product end to end before a release. Not a CI gate and not a replacement for `pnpm test:e2e`.
---

# /qa-walkthrough

Walks the **whole** flow catalogue (`packages/qa-skill/catalogue/flows.json`) in a real browser and
reports Pass / Fail / Skip for every staff and student flow.

- **Student** = Prep Year candidate **and** enrolled scholar. Both-stage flows run as each.
- Default target is **test** (`*-test.ashinaga-uk.org`). **Prod is refused.**
- This is **on demand**. `pnpm test:e2e` stays the short CI smoke; this skill is not required on PRs.
- The catalogue is the single list of flows. The flow-coverage detector (ASH-123) uses the same IDs.

## Setup

1. Configure package-local env:
   ```bash
   cd packages/qa-skill
   cp .env.example .env.local
   ```
   Fill `.env.local` with a super-admin staff account, a Prep Year candidate and an enrolled
   scholar **on the target**. Missing personas are reported as **Skip**, never silently dropped.
2. Browsers: the package uses `@playwright/test`. If Chromium is missing, run
   `pnpm --filter @ashinaga/qa-skill exec playwright install chromium`.

### Local target

Point at a locally running API + staff + scholar app (defaults 4000/4001/4002, or set `API_URL`,
`STAFF_APP_URL`, `SCHOLAR_APP_URL`). Seed the fixture accounts into the **local** database first;
it reuses the same raw-SQL + Better Auth hashing as the Playwright `auth.setup.ts` files and
refuses non-localhost databases:

```bash
pnpm --filter @ashinaga/qa-skill seed:local       # prints QA_INVITE_TOKEN for the signup flow
QA_TARGET=local pnpm --filter @ashinaga/qa-skill qa
```

## Run

```bash
pnpm --filter @ashinaga/qa-skill qa                       # full catalogue on test
pnpm --filter @ashinaga/qa-skill qa -- --only staff.prep  # one area (id or id prefix)
pnpm --filter @ashinaga/qa-skill qa -- --headed           # watch it
pnpm --filter @ashinaga/qa-skill dev list                 # print the catalogue
```

Output: a Markdown table on stdout plus `reports/<timestamp>/report.md`, `report.json` and a
screenshot for every failure. Exit code is 1 when any flow fails.

## What the results mean

| Result | Meaning |
|---|---|
| **Pass** | Every step in the flow ran and the page matched. |
| **Fail** | The flow exists and the UI is wrong. The note names the **flow, step, URL and what was on screen**, and links a screenshot. |
| **Skip** | A fixture is missing (persona credentials, `{scholarId}`, `{inviteToken}`), the flow has **write steps** that were not run, or the catalogue marks the flow as not in the app. The note says which. |

### Write steps

Steps marked `"write": true` create or change data (send an invite, send an announcement, publish a
resource, approve a request). The runner **never** performs them: it runs the read steps and reports
the flow as Skip listing the pending writes.

When you (the agent) run this skill:

1. Run the command above and read the report.
2. Only if the person asked for write coverage on **test**, walk each pending write step by hand in the
   browser (Claude in Chrome or Playwright), using disposable data (`qa-...@example.org`), and follow
   each step's `note`. Update that row to Pass/Fail with what you saw.
3. **Never** click "Flip to scholar" or any other stage change unless a catalogue step asks for it.
4. Paste the final table back to the person. Do not drop Skip rows; each needs its reason.

## Changing the catalogue

- Add a flow when you add a staff section, profile tab, student page or nav item. `pnpm --filter
  @ashinaga/qa-skill test` fails if a staff nav section, scholar profile tab or student nav item has no
  flow.
- Flow IDs are stable (`area.flow-name`). Renaming one means updating every consumer.
- Each flow lists the `specs` that cover it (or a `specSkip` reason). `pnpm check:flow-coverage`
  uses this map to flag new flows without tests; see `.claude/skills/flow-coverage/SKILL.md`.
- A flow that the ticket lists but the app does not have stays in the catalogue with a `skip` reason.

## Troubleshooting

- `no staff credentials` → set `QA_STAFF_EMAIL` / `QA_STAFF_PASSWORD` in `.env.local`.
- `sign-in failed: 401` → the account doesn't exist on that target or the password is wrong.
- `Missing fixture: {scholarId}` → no enrolled scholar visible to the staff account; set `QA_SCHOLAR_ID`.
- `Refusing to run against production` → working as intended.
