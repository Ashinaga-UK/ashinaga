# ASH-39 — Admin reporting dashboard: Scholar submissions

Linear: [ASH-39](https://linear.app/ashinaga/issue/ASH-39/admin-reporting-dashboard-scholar-submissions)
Base: `origin/test` @ `771a2cf5`. Plan only, no implementation in this PR.

## Ticket intent

A report on what scholars **submit**: requests, goal updates and task submissions. It complements
the Scholar activity dashboard.

- Breakdown by type (request type, goal update, task submission), with counts over time.
- A per-scholar drill-down that shows the scholar's submission history.
- Filters: cohort, submission type, status (pending/approved/rejected), date range.
- CSV export.
- **Done when:** volume and mix are visible for the whole organisation and per cohort, any scholar's
  full history can be opened, and the numbers reconcile against the raw tables.

## 1. Inventory: what already exists

### On `origin/test`

| Surface | Where | Grain | Relevant to ASH-39 |
|---|---|---|---|
| Scholar activity report | `apps/api/src/scholar-activity-report/*`, `apps/staff/components/scholar-activity-report.tsx`, tab `scholar-activity` | One row per scholar | Counts tasks completed and goals updated in a date range. Has the house pattern for reports (below). Does not count requests or individual submissions. |
| Prep Year report | `apps/api/src/prep-year-report/*`, `prep-cohort-report.tsx` | One row per Prep scholar | CSV and print. Prep Year only. |
| Annual reviews report | `annual-updates` controller, `annual-reviews-report.tsx` | One row per annual update | A separate kind of submission (draft/submitted). Not named in the ticket. |
| Overview | `apps/api/src/overview/*` | Dashboard tiles | Lists pending requests, scoped by `isSuperAdmin`. |
| Request stats | `GET /api/requests/stats` (`requests.service.ts` `getRequestStats`) | Counts by status | No type, month or cohort breakdown. Scoped to assigned requests for non-super-admins. |
| Request list | `GET /api/requests` | One row per request | Already filters by type, status, program, year and `submittedFrom`/`submittedTo`. Excludes `archived`. Scoped to assigned requests for non-super-admins. |
| CSV helper | `apps/api/src/utils/csv.ts` `escapeCsvValue` | — | Safe against formula injection. Reuse it. |
| Staff CSV download | `apps/staff/lib/api-client.ts` `downloadCsvFile` | — | Reuse it. |

The house pattern for reports is the scholar activity report:

- The controller is `api/<name>/report` plus `report/csv`, guarded by `StaffGuard`, with `ValidationPipe({ transform, whitelist })`.
- The service does SQL aggregation per source, joined to a `filtered_scholars` subquery rather than a growing `IN` list.
- A pure `*-report.ts` module holds the shaping, sorting, pagination and CSV logic, so it can be unit-tested without a database.
- Cohort filters match trimmed, case-folded values (`foldedEquals`), because of fix `2b7f8b6f`.
- Date ranges go through `activityRangeStart`/`activityRangeEnd`: a date-only `to` includes that whole UTC day, and `from >= to` returns 400.
- An integration spec lives at `apps/api/test/integration/scholar-activity-report.integration.spec.ts`.
- A flow-catalogue entry `staff.scholar-activity` exists in `packages/qa-skill/catalogue/flows.json`.

### Old branch `origin/rgnpx/ash-39-admin-reporting-dashboard-scholar-submissions`

This is one commit, `4e7453a1` (2026-09-29), with about 1,860 lines across 15 files. It has no PR,
it is 165 commits behind `test`, and it **conflicts** with `test` in `apps/staff/app/page.tsx`,
`apps/staff/lib/api-client.ts` and `apps/staff/lib/hooks/use-queries.ts`. It adds:

- An API module `submission-report` with `GET /api/submissions/report`, `/report/csv` and `/scholars/:scholarId`.
- A `submissions` staff tab, the `submissions-report.tsx` component, and unit tests.

It covers most of the ticket's surface. These problems mean it should be **salvaged, not rebased as is**:

| # | Severity | Finding in `4e7453a1` | Fix in this plan |
|---|---|---|---|
| O1 | **High (security)** | It is guarded only by `StaffGuard` and returns request rows, including `description`, to every staff member. On test, non-super-admins only see requests assigned to them (`requests.service.ts` `getRequests` and `getRequestStats`). | Restrict to super admins (decision D1). |
| O2 | High (performance) | It loads every request, goal and task-response row into Node, then buckets, filters and paginates in memory. CSV and the summary are unbounded. | Aggregate in SQL. Page the history with `LIMIT`/`OFFSET` in SQL. |
| O3 | Medium | Program/year filters use exact `eq`, so cohorts drift from the activity report (the bug fixed in `2b7f8b6f`). | Reuse `foldedEquals` and the activity cohort key. |
| O4 | Medium | It drops `archived` requests, so totals do not reconcile with `requests`. | Include archived requests by default and show an "Archived" column. |
| O5 | Medium | "Pending" for tasks maps to `tasks.status in (pending, in_progress)`, but a task with a response is always `completed` (`completeTask` sets it, and reopening deletes the response, `tasks.service.ts` around line 476). That filter always returns zero tasks. | Status applies to requests only (decision D3). |
| O6 | Medium | Ignores the `reviewed` and `commented` request statuses. | Expose the full `request_status` enum. |
| O7 | Low | No `from < to` validation, no scholar status or stage filter, and filter options are not trimmed or folded. | Copy the activity DTO and helpers. |
| O8 | Low | A goal update means `updatedAt > createdAt`, which counts each goal once, at its latest edit. It is presented as volume over time without a caveat. | Decision D2. |

Worth salvaging: the DTO shape, the `SUBMISSION_KINDS` constants, the CSV columns, the component
layout, and the test cases for the pure module.

## 2. Gap analysis against the ticket

| Ticket item | Covered on test? | Gap |
|---|---|---|
| Submission volume by type over time | No. Activity counts tasks and goals per scholar in a range, with no requests and no buckets. | Monthly series by kind and request type. |
| Organisation and cohort mix | Partly: the activity report has cohort rows, but for logins and tasks, not submissions. | A cohort × kind matrix. |
| Per-scholar history | No unified view. The scholar profile has separate Goals and Tasks tabs and no requests tab. | One history list per scholar, paginated. |
| Filters: cohort, type, status, date | Request list only (requests only, exact-match cohort). | A shared filter DTO. |
| CSV | No. | A row-level CSV of submissions. |
| Reconciles with raw tables | Not applicable yet. | Documented definitions (section 4) and an integration test that counts raw tables. |

## 3. Decisions (recommendation first; the parent should confirm D1 and D2 before slice 1 merges)

- **D1. Who can see it?** *Recommend super admins only* (`staff.is_super_admin`). It matches "Admin"
  in the title and the existing visibility rule for requests. The UI hides the nav item for
  non-admins. Alternative: show everyone, and scope request rows and counts to assigned requests
  like `getRequests`. That makes organisation totals differ by viewer, which breaks the
  "reconcile" promise.
- **D2. What is a "goal update"?** There is no goal history table. `goals.updatedAt` is
  overwritten on each scholar edit (`goals.service.ts` `updateGoal`), and goals are hard-deleted.
  - *Slice 1 (recommended):* report **goal submissions = goals created** (`goals.created_at`,
    immutable). Add a separate "last updated in range" figure, labelled honestly as counting
    each goal at most once.
  - *Slice 4 (optional, needs a yes):* add an append-only `goal_update_events` table written in
    `updateGoal`, which gives true update volume from deploy day forward. There is no backfill;
    the UI states the start date.
- **D3. Status filter scope.** pending/approved/rejected (plus reviewed/commented) exist only on
  `requests`. Goals and task responses have no review state. *Recommend:* when a status is set,
  the report shows requests only, and the UI disables the goal and task kinds with a hint. The
  alternative, inventing a status mapping for tasks and goals, is the O5 bug.
- **D4. Task submission.** A task submission is a `task_responses` row, timestamped by
  `submitted_at` (first submission; resubmits touch `updated_at` only). Soft-deleted tasks
  (`tasks.deleted_at`) are excluded. A response removed by a staff reopen is gone; that limit is
  documented and not fixed here.

## 4. Data model and query notes

No new tables in slices 1–3. One index migration.

Submission definitions (these are the reconciliation contract):

| Kind | Source row | Event time | Breakdown | Status | Included |
|---|---|---|---|---|---|
| `request` | `requests` | `submitted_date` | `type` (the 5 enum values) | `status` (the 5 enum values) | All rows, including `archived` |
| `goal` | `goals` | `created_at` | `category` | — | All rows |
| `task_submission` | `task_responses` ⨝ `tasks` | `task_responses.submitted_at` | `tasks.type` | — | `tasks.deleted_at IS NULL` |

Cohort means `(program, year)` matched with `foldedEquals`. Scholar filters (status default `all`,
stage, cohort) apply through the same `filtered_scholars` subquery as the activity report.

```
          query DTO ──► SubmissionReportService
                          │  assertSuperAdmin(userId)
                          │  filtered_scholars (folded cohort, status, stage)
            ┌─────────────┼───────────────────────────┐
            ▼             ▼                           ▼
   requests GROUP BY   goals GROUP BY        task_responses⨝tasks GROUP BY
   month,type,status,  month,category,       month,task.type,
   program,year        program,year          program,year
            └─────────────┬───────────────────────────┘
                          ▼
         submission-report.ts (pure): fill empty months, totals,
         cohort×kind matrix, filter options ──► JSON
   history / CSV: UNION ALL of the 3 sources (id, kind, subtype, status,
   occurred_at, title, scholar) ORDER BY occurred_at DESC, id
   LIMIT/OFFSET (history) · capped full read (CSV)
```

- Buckets are `date_trunc('month', <event time> at time zone 'UTC')`. The default range is the
  last 12 months. The range is capped at 36 months (400 above that), so the series stays bounded.
- Aggregate queries return one row per (month, subtype, status, cohort). That is bounded by
  36 × 5 × 5 × cohorts, not by submission count.
- History uses `UNION ALL` through `db.execute(sql\`...\`)` or three Drizzle selects combined with
  `unionAll`. Its order is `occurred_at DESC, id`, so pages are stable.
- **Index migration:** `requests` has only a primary key. Add
  `requests_scholar_id_submitted_date_idx (scholar_id, submitted_date)`. `task_responses.task_id`
  is already unique, `tasks_scholar_id_active_idx` exists, and goals are covered by
  `goals_scholar_id_updated_at_idx` on `scholar_id`. A `created_at` index can wait until there is
  evidence it is needed.

## 5. API and UI shape (design twice)

**Shape A: per-event SQL module (chosen).** A new `submission-report` module with one service and
three public methods:

```ts
getReport(userId: string, q: SubmissionReportQueryDto): Promise<SubmissionReport>        // summary, series, cohorts, filterOptions
getHistory(userId: string, q: SubmissionReportQueryDto & { scholarId?: string; page; limit }): Promise<SubmissionHistoryPage>
exportCsv(userId: string, q: SubmissionReportQueryDto): Promise<string>
```

The kind definitions (table, time column, subtype, status, deletion rule) live in **one**
`SUBMISSION_SOURCES` map in `submission-report.ts`. The aggregate, history and CSV paths all
derive from it, so there is no hand-synced list (red flag 8).

**Shape B: extend the scholar activity report.** Add per-scholar request, goal and task counts as
more columns on `ScholarActivityRow`. It needs fewer files and no new module. It was rejected
because the grain is wrong: the ticket needs per-event history, a request-type breakdown and a
status filter. Bolting those onto a per-scholar report gives it two purposes (red flags 1 and 6),
and the activity filters (logins) do not apply.

**Why A:** it hides kind policy, cohort folding, admin gating and bucketing behind three methods.
B spreads submission semantics across a module that owns login staleness.

Red-flag screen of A:
- Information leakage: request-status strings must not be redefined in the staff app. Export the
  types through `api-client.ts` types, as the activity report does.
- Two ways to do one task: reuse `foldedEquals` and `activityRangeStart`/`activityRangeEnd`. Move
  them to `apps/api/src/utils/report-filters.ts` and update the activity report in the same
  change; do not copy them, as the old branch did with `submissionRangeStart`.
- Pass-through: the controller only parses and forwards, which is acceptable and matches the house
  style.
- No other flags.

**Routes** (specific routes before parameterised ones):
- `GET /api/submissions/report`
- `GET /api/submissions/report/csv`
- `GET /api/submissions/history` (organisation-wide, paginated)
- `GET /api/submissions/scholars/:scholarId/history`

All of them use `StaffGuard` plus a super-admin check in the service (D1). Non-admins get 403. An
unknown scholar returns 404.

**UI:** a new staff tab `submissions` ("Submissions") after "Scholar activity":

- Stat tiles by kind.
- A stacked monthly bar chart. Check whether `packages/ui` already has a chart; if not, use a
  simple CSS bar list to avoid adding a dependency.
- A cohort × kind table.
- A paginated history table.
- Filters: cohort (program, year), kind, request type, status, date range, scholar status.
- Clicking a scholar opens a drill-down panel (a sheet) that calls `/scholars/:id/history` with the
  same filters except cohort, plus a "View profile" link.
- An Export CSV button.

## 6. Files (estimated)

API:
- `apps/api/src/submission-report/{submission-report.module.ts, .controller.ts, .service.ts, submission-report.ts, dto/submission-report-query.dto.ts}`: new (3 classes: module, controller, service).
- `apps/api/src/utils/report-filters.ts`: new; move the folded-equals and range helpers here.
- `apps/api/src/scholar-activity-report/*.service.ts`, `scholar-activity-report.ts`: import the moved helpers.
- `apps/api/src/app.module.ts`: register the module.
- `apps/api/src/db/schema/requests.ts` plus a generated migration `00xx_requests_submitted_idx.sql` and its journal entry.

Staff:
- `apps/staff/components/submissions-report.tsx` (new), `staff-layout.tsx`, `app/page.tsx`, `lib/api-client.ts`, `lib/hooks/use-queries.ts`.

Catalogue: `packages/qa-skill/catalogue/flows.json` gets a `staff.submissions` flow.

That is about 15 changed or new files and 3 new classes, which is over the 8-file / 2-class
threshold. The 3 classes are the repo's standard report triad and cannot be merged into fewer.
To reduce review size, **split delivery into slices** (below) so that no PR exceeds about 8 files.

## 7. Phased delivery

1. **Slice 1: API aggregates and CSV (recommended first PR).**
   - Move the report-filter helpers (activity tests stay green).
   - Add the index migration.
   - Add the `submission-report` module with `report` and `report/csv` and the admin gate.
   - Add unit and integration specs.
   - The API can be demoed in Swagger. No UI.
2. **Slice 2: staff tab.** Nav item, component, tiles, series, cohort table and CSV button, plus the
   flow catalogue entry and a component test.
3. **Slice 3: history and drill-down.** `GET /history` and `/scholars/:id/history`, the history
   table, and the drill-down sheet.
4. **Slice 4 (optional, D2).** Add the `goal_update_events` table, write to it in
   `GoalsService.updateGoal`, and add a "goal update" kind to `SUBMISSION_SOURCES`.

## 8. Tests (each names the regression it catches)

Unit tests (`submission-report.spec.ts`, pure module):
- Fills empty months across the range, so a gap month does not disappear.
- Range cap of 36 months returns 400, so the series stays bounded.
- A date-only `to` includes that day, so there is no off-by-one at the end of the range.
- A cohort matrix with `" Year 1 "` vs `"year 1"` folds into one row (regression `2b7f8b6f`).
- The CSV escapes `=cmd` cells and keeps the header order stable.
- Setting a status drops the goal and task kinds (D3, regression O5).

Service and controller specs:
- A non-super-admin gets 403, so no request leak (O1).
- Routes are declared in full (`/api/submissions/report`, `/report/csv`, `/history`,
  `/scholars/:scholarId/history`), which the flow-coverage check requires.
- An invalid UUID returns 400 and an unknown scholar returns 404.

Integration (`apps/api/test/integration/submission-report.integration.spec.ts`, Postgres on port 5433). The fixtures are:
- Two cohorts.
- An archived request.
- A request in each status.
- A soft-deleted task that has a response.
- A goal created outside the date range.

The assertions are:
- **Reconciliation:** each kind's total equals a raw `count(*)` on the source table with the same
  filters (the "done when" item).
- Archived requests are counted (O4).
- Soft-deleted tasks are excluded.
- A cohort filter folds case.
- History pages are stable and do not overlap (`occurred_at` ties broken by `id`).
- A super admin sees requests not assigned to them, and a viewer gets 403.

Staff (`__tests__/submissions-report.test.tsx`, `staff-layout.test.tsx`):
- Filters map to query params.
- Choosing a status disables the goal and task kinds.
- The CSV call omits `page`.
- The nav item is hidden for non-admins.
- The drill-down fetches the scholar history.

## 9. Performance

Scale is **unknown**. The seed has 30 scholars, and production scholar and request counts were not
measured. Estimates:

- **Aggregates:** three `GROUP BY` queries per request, each scanning the filtered scholars' rows
  through the `scholar_id` indexes. The output is bounded by months × subtypes × cohorts, not by
  rows. No N+1.
- **History:** a `UNION ALL` with `ORDER BY occurred_at DESC LIMIT 50 OFFSET n`. Postgres sorts the
  filtered union, which is O(rows in range) per page. It is acceptable at thousands of rows and
  degrades at about 10⁶; keyset pagination is listed under NOT in scope.
- **CSV:** a full read of the filtered union into memory, at roughly 200 bytes per row. Cap it at
  50,000 rows (about 10 MB) and return 400 with "narrow the date range" above that. Streaming is
  deferred.
- **Filter options:** `selectDistinct` of program and year, as the activity report does. It is
  skipped for CSV.
- **Caching:** none. React Query `staleTime` matches the activity hook.

## 10. Risks

- **D1 changes who sees it.** If the product wants viewers to see it, request scoping must be
  designed before slice 1 merges.
- **Goal semantics (D2).** Admins may read "goals" as "goal updates". Label it in the UI and the
  CSV header.
- **History loss.** Hard-deleted goals, requests deleted when a scholar is deleted
  (`scholars.service.ts` around line 1426), and task responses removed on reopen all make past
  totals shrink. This is documented, and slice 4 does not fix it beyond goal updates.
- **Old branch drift.** Nobody should rebase `4e7453a1` onto test. This plan replaces it. Close the
  branch after slice 3 merges.
- **Time zones.** Buckets are UTC, as the activity report uses. A UK staff member could see a
  late-night submission in the next month near midnight on the 31st. Accepted.

## NOT in scope

- Annual updates and proposal submissions as kinds (possible follow-up; they fit `SUBMISSION_SOURCES`).
- Backfilling goal-update history.
- Keyset pagination and streaming CSV.
- Charts library adoption.
- Scheduled or emailed reports.
- Changing request visibility rules elsewhere.
- A scholar-profile "Submissions" tab (the drill-down lives in the report).
- Print or PDF.
- Scholar-portal changes.
