# ASH-35 — Scholar navigation: clearer labels and information architecture

Linear: [ASH-35](https://linear.app/ashinaga/issue/ASH-35/improve-scholar-navigation-clearer-labels-and-information-architecture)
Related: [ASH-65](https://linear.app/ashinaga/issue/ASH-65) (staff nav audit, resolved via ASH-78), [ASH-67](https://linear.app/ashinaga/issue/ASH-67) (scholar UX research umbrella; ASH-68/69/70 still Backlog)
Base: `origin/test` @ `771a2cf5`
Status: plan only — no app code in this PR.

## TL;DR

The scholar portal already meets the ticket's measurable "done when" (every core flow is ≤ 2 taps from
home on mobile, 1 click on desktop). What it lacks is **structure and wording**: one flat list of 10
items with the two most-used flows (Tasks, Requests) in 7th/8th place, an unexplained acronym ("My LDF")
for the thing the ticket calls "goals", a "My …" prefix on 7 of 11 labels, an active state that is
visual-only and computed two different ways, and inconsistent page headings.

Recommended split:

1. **PR 1 — structure, no renames (no Ops dependency).** Reorder and group the sidebar, one shared
   active-route rule with `aria-current="page"`, fix the duplicate FAQs heading on mobile, make dashboard
   quick actions real links. ~6 files, no new modules.
2. **PR 2 — label renames (after Ops signs off the label table below).** One atomic copy PR across nav,
   page headings, dashboard, tests, e2e and the QA flow catalogue.
3. **Later, evidence-gated.** Bottom tab bar on mobile, "Home" vs "Overview", moving Profile to the
   footer, single owner for page titles — only if ASH-68/69/70 research shows the need.

## Corrections vs the ticket

| Ticket says | Code / backlog says | Effect on plan |
| --- | --- | --- |
| Audit against "observed confusion points (support tickets / user interviews)" | No such evidence is recorded. The interviews are ASH-68/69/70, all Backlog. ASH-65 was a **staff** nav audit, closed via ASH-78. | Plan works from code-evident problems; Ops label review is the validation gate. Research-driven changes are Phase 3. |
| "≤ 2 taps from the home screen" to submit a request, view goals, view tasks | Already true. Desktop: 1 click in the sidebar. Mobile: hamburger + item = 2 taps. Dashboard stat cards link to `/tasks`, `/goals`, `/requests` (1 tap) and "Create Request" opens the dialog (1 tap). | Not a build item. Becomes a regression test so it stays true. |
| "Breadcrumbs" | IA is one level deep; no nested routes exist under `app/(scholar)/`. | Breadcrumbs add nothing. Replace with "one consistent page title per route". |
| "Mobile nav parity" | Mobile uses the same `NAV_ITEMS` rendered as a sheet; parity of items already holds. | Parity is about active state + headings, covered in PR 1. A bottom bar is Phase 3. |
| "find … goals" | The UI never says "goals" in nav; it says "My LDF". Route is `/goals`. | The LDF label is the single strongest rename candidate. |

## Current IA inventory (origin/test)

Source of truth: `NAV_ITEMS` in `apps/scholar/components/scholar-layout.tsx`. Visibility via
`getVisibleNavItems(programStage, profileStatus)`; `programStage` from `lib/scholar-session.tsx`.

| # | Route | Nav label | Icon | Visible to | Page title on desktop (element, file) |
| --- | --- | --- | --- | --- | --- |
| 1 | `/dashboard` | Overview | Home | all | `h1` "Welcome back, {name}!" (`dashboard/page.tsx`) |
| 2 | `/profile` | My Profile | User | all | `h1` My Profile (`my-profile.tsx`) |
| 3 | `/documents` | My Documents | FolderOpen | prep_year only (page redirects others) | `h2` My Documents (`my-documents.tsx`) |
| 4 | `/goals` | My LDF | Target | all | `h1` My LDF + "Track and manage your Leadership Development" (`my-goals.tsx`) |
| 5 | `/annual-review` | My Annual Review | ClipboardCheck | scholar only (page redirects others) | `h1` My Annual Review (`my-annual-review.tsx`) |
| 6 | `/proposal` | My Proposal | PenLine | anyone once profile is `ready` (both stages) | `h2` My Proposal (`my-proposal.tsx`) |
| 7 | `/tasks` | My Tasks | CheckSquare | all | `h2` My Tasks (`my-tasks.tsx`) |
| 8 | `/requests` | My Requests | FileText | all | `h2` My Requests (`requests/page.tsx`) |
| 9 | `/announcements` | Announcements | MessageSquare | all | `h2` Announcements (`announcements/page.tsx`) |
| 10 | `/resources` | Resources | Library | all | `h1` Resources (`resources/page.tsx`) |
| 11 | `/faqs` | FAQs | HelpCircle | all | `h1` FAQs, **always visible** (`scholar-faqs.tsx`) |
| — | footer | Logout | LogOut | all | — |

Visible counts: enrolled scholar 10 (no Documents), Prep Year 10 (no Annual Review), profile error 8.

Header (`ScholarHeader`): mobile shows the nav label of the current section as `h1` (brand on home);
desktop always shows the brand `h1` ("Ashinaga Scholar Portal" / "Ashinaga Prep Year"). Bell + theme
toggle on the right.

Other entry points:

- Dashboard stat cards (`<Link>`): Pending Tasks → `/tasks`, Active LDF Goals → `/goals`, Open Requests →
  `/requests`, New Announcements → `/announcements`.
- Dashboard "LDF Progress" card and "Quick Actions" (`<Button onClick={router.push}>`, not links):
  View My Tasks, Create Request (dialog), View Announcements, My LDF & Progress.
- Notification bell: API-provided `href` (`/tasks`, `/announcements`, `/resources`) via `router.push`.

Already merged and relevant (do not redo): collapsible icon rail + cookie persistence, mobile sheet with
"Close menu", section title in mobile header, no "Back to Overview" link (#114 and the `fix(sidebar)`
series), empty states for documents/requests/filters (#183).

## Problems observed in code

| # | Severity | Problem | Evidence |
| --- | --- | --- | --- |
| P1 | High | **No grouping, wrong order.** One flat list mixes account (Profile), programme work (LDF, Proposal, Documents, Annual Review, Tasks, Requests) and information (Announcements, Resources, FAQs). The two most frequent actions sit 7th and 8th, below Profile and four stage-specific items. | `NAV_ITEMS` order |
| P2 | High | **"My LDF" is unexplained jargon.** The ticket's own word is "goals"; route is `/goals`; the page subtitle that should expand the acronym is truncated ("Track and manage your Leadership Development"). The dashboard uses three more variants: "Active LDF Goals", "LDF Progress", "My LDF & Progress". | `scholar-layout.tsx`, `my-goals.tsx:178-183`, `dashboard/page.tsx` |
| P3 | Medium | **Active state is visual-only.** The active link gets `data-active` and teal colour but no `aria-current="page"`; screen readers cannot tell where they are. | `ScholarSidebar` |
| P4 | Medium | **Two active-route rules.** Sidebar uses `pathname === item.href`; header uses `getScholarSection` with a prefix match. Latent today (no nested routes) but any `/requests/[id]` page would title the header "Requests" while nothing is highlighted in the sidebar. Red flag: two ways to do one task. | `scholar-layout.tsx:76-83` vs `:122` |
| P5 | Medium | **"My" prefix noise and inconsistency.** 7 of 11 labels start with "My"; Announcements/Resources/FAQs don't. Staff nav has no "My". The prefix pushes the distinguishing word right and truncates worse in the mobile header. | `NAV_ITEMS` |
| P6 | Medium | **Inconsistent page headings.** Pages mix `h1` and `h2` for the same role. FAQs renders its `h1` at all widths, so on mobile the title appears twice (header `h1` "FAQs" + page `h1` "FAQs"). | Inventory table |
| P7 | Low | **Dashboard quick actions are buttons that navigate.** No link semantics (no open-in-new-tab, announced as button), and their labels don't match nav ("View My Tasks", "Create Request" vs "New Request" on `/requests`, "My LDF & Progress"). They duplicate the stat cards. | `dashboard/page.tsx:330-374` |
| P8 | Low | **Nav pop-in.** Documents / Annual Review / Proposal appear only after the profile loads, so items shift under the pointer on slow connections. Grouping stage-gated items together contains the shift. | `getVisibleNavItems` |
| P9 | Low | **Labels are hand-synced in ~6 places**: `NAV_ITEMS`, each page component heading, dashboard copy, `scholar-layout.test.tsx`, `scholar-features.e2e-spec.ts`, `packages/qa-skill/catalogue/flows.json` (+ `catalogue.test.ts`). A rename that misses one breaks QA walk or e2e. | grep for "My LDF" / "My Requests" |
| P10 | Info | "New Announcements" counts all announcements, not new ones. Copy-accuracy bug, not IA. | `dashboard/page.tsx:82` |
| P11 | Open | Proposal is shown to enrolled scholars too; flows.json already flags "confirm which is intended". | `getVisibleNavItems`, `flows.json:1081` |

## Proposed IA

Grouped sidebar, ordered by frequency of use, using the existing shadcn `SidebarGroup` +
`SidebarGroupLabel` (labels already fade out in the collapsed icon rail).

```
Overview                      (ungrouped, top)

My programme                  (group label)
  Tasks
  Requests
  Goals            ← "My LDF"
  Proposal                    (stage/profile gated)
  Documents                   (prep_year only)
  Annual review               (scholar only)

Updates & help                (group label)
  Announcements
  Resources
  FAQs

Profile                       (PR 1: last item in content; Phase 3 candidate: footer next to Logout)
─────────
Logout                        (footer, unchanged)
```

Gated items sit at the end of "My programme", so pop-in (P8) no longer moves Tasks/Requests/Goals.

### Label table for Ops review (PR 2)

| Today | Proposed | Page subtitle (proposed) | Confidence |
| --- | --- | --- | --- |
| Overview | Overview (keep) | — | Keep; "Home" is an Ops question |
| My Tasks | Tasks | unchanged | High |
| My Requests | Requests | "Ask Ashinaga about funding or extenuating circumstances." | High |
| My LDF | Goals | "Your Leadership Development Framework (LDF) goals." | Needs Ops: do scholars know "LDF" from programme materials? Alt: "LDF goals" |
| My Proposal | Proposal | unchanged | High |
| My Documents | Documents | unchanged | High |
| My Annual Review | Annual review | unchanged | High (sentence case to match other labels) |
| My Profile | Profile | unchanged | High |
| Announcements / Resources / FAQs | unchanged | — | — |
| Dashboard: Active LDF Goals / LDF Progress / My LDF & Progress | Active goals / Goals progress / Goals | — | Follows the Goals decision |
| Dashboard: View My Tasks / Create Request / View Announcements | Tasks / New request / Announcements | — | High; matches nav and `/requests` button |

Group labels "My programme" and "Updates & help" also need Ops sign-off.

## PR 1 — structure (recommended first slice)

No label renames, so no Ops dependency and no changes to e2e/flow catalogue label strings.

1. **`apps/scholar/components/scholar-layout.tsx`**
   - Reorder `NAV_ITEMS` and add a `group` field (`'home' | 'programme' | 'info' | 'account'`); render one
     `SidebarGroup` per group with a `SidebarGroupLabel` (none for home/account). Keep `NAV_ITEMS` the
     single list; derive groups from it, do not add a second list (P9).
   - One `isActiveRoute(pathname, href)` used by both the sidebar and `getScholarSection` (P4): exact match
     or `startsWith(href + '/')`, with `/dashboard` exact-only.
   - Pass `aria-current={isActive ? 'page' : undefined}` on the nav `<Link>` (P3).
2. **`apps/scholar/components/__tests__/scholar-layout.test.tsx`** — see tests below.
3. **`apps/scholar/components/scholar-faqs.tsx`** — page `h1` gets `hidden md:block print:block`, matching
   every other page (P6).
4. **`apps/scholar/app/(scholar)/dashboard/page.tsx`** — quick actions that navigate become `<Button asChild><Link>`
   (P7). Keep current text in PR 1. Dialog trigger stays a button.
5. **`apps/scholar/app/(scholar)/dashboard/page.test.tsx`** — quick actions are links with the right `href`.
6. **`apps/scholar/test/e2e/scholar-features.e2e-spec.ts`** — only if order-sensitive assertions break;
   today it selects by name, so likely untouched. Add one check: active link has `aria-current="page"`
   after navigating on mobile.

Complexity: 5–6 changed files, 0 new modules/services. Flow-coverage check stays silent (no new route or
nav `href`).

## PR 2 — labels (after Ops review)

Apply the approved label table atomically:

- `scholar-layout.tsx` (`NAV_ITEMS` labels)
- Page headings/subtitles: `my-goals.tsx` (+ finish the truncated subtitle), `my-tasks.tsx`,
  `requests/page.tsx`, `my-documents.tsx`, `my-proposal.tsx`, `my-annual-review.tsx`, `my-profile.tsx`
- `create-goal-dialog.tsx` ("Create New LDF Goal" → per decision), `dashboard/page.tsx`
- Tests: `scholar-layout.test.tsx`, `dashboard/page.test.tsx`, any component tests asserting headings
- `apps/scholar/test/e2e/scholar-features.e2e-spec.ts` ("My Requests" ×3)
- `packages/qa-skill/catalogue/flows.json` (~25 label refs incl. `see` / `notSeeLink` steps) and
  `packages/qa-skill/src/catalogue.test.ts` (`notSeeLink` "My Annual Review" / "My Documents")

~15 files but copy-only; exceeds the 8-file guideline by count, not by risk. Splitting it would leave nav
and page titles disagreeing between PRs, which is the bug we're fixing — keep it one PR. Before
opening, `rg "My (LDF|Tasks|Requests|Documents|Proposal|Annual Review|Profile)"` across `apps/scholar`,
`packages/qa-skill` must return only intentional hits.

## Phase 3 — evidence-gated (not planned for build)

- Mobile bottom tab bar (Overview / Tasks / Requests / Goals / More) — only if ASH-68/69/70 show
  hamburger discoverability is the problem.
- "Overview" → "Home"; Profile into the footer with Logout (account menu).
- Single owner for page titles (shell renders title for all breakpoints from `NAV_ITEMS`, pages stop
  rendering their own) — removes the remaining hand-sync between nav labels and headings, but touches
  every page and print styles.
- Staff portal parity: staff labels are already plain ("Requests", "Prep tasks", "Annual Reviews"); only
  touch staff if Ops wants shared terminology (e.g. "Annual review" casing).

## Architecture review

- **Boundaries:** all change is inside the scholar shell (`ScholarLayout`) and page copy. No API, auth,
  data or session changes. `ScholarSessionProvider` and stage gating unchanged.
- **Two shapes:** no new module/boundary is introduced — design-twice not required. The one structural
  choice: groups as a field on `NAV_ITEMS` (picked) vs. a separate `NAV_GROUPS` array of item ids
  (rejected: second hand-synced list, red flag #8).
- **Red flags addressed:** #6 two active rules → one `isActiveRoute`; #8 hand-synced lists → groups
  derived from `NAV_ITEMS`; label hand-sync across tests/catalogue is accepted in PR 2 and removed in
  Phase 3 if pursued.
- **Production failure to handle:** profile request fails (`profileStatus: 'error'`). Today nav drops
  Documents/Annual Review/Proposal; with grouping, "My programme" still renders Tasks/Requests/Goals, so the
  group never renders empty. Covered by an existing test, extended to assert group structure.

## Code quality review

- Keep the stage filter in `getVisibleNavItems`; don't spread stage checks into render.
- Edge: an empty group (all its items filtered) must not render a dangling label — guard in render.
- Edge: collapsed icon rail — group labels are hidden by the primitive; tooltips still come from `label`.
- Edge: unknown route under `(scholar)` — `getScholarSection` falls back to Overview; keep, and assert
  nothing is `aria-current` in the sidebar for it.
- Fix the truncated goals subtitle in PR 2 (copy bug, P2).
- P10 ("New Announcements" count) is a separate copy-accuracy bug — file a follow-up rather than fold in.

## Test review

| Behaviour | Test | Regression caught |
| --- | --- | --- |
| Order + groups for enrolled scholar | `scholar-layout.test.tsx`: link names in DOM order; group labels present; Documents absent | Someone re-sorts or adds an item to the wrong group |
| Order + groups for Prep Year | same, `programStage: 'prep_year'`; Annual Review absent | Stage gating breaks grouping |
| Profile error | same; "My programme" still has Tasks/Requests/Goals, no empty group label | Empty group renders a dangling heading |
| Single active rule | `navState.pathname = '/requests'` → only Requests link has `aria-current="page"`; header title matches | Sidebar and header disagree |
| Nested path | `'/requests/abc'` → Requests active + header "Requests" | P4 recurring once detail routes exist |
| Home exact-only | `'/dashboard'` → Overview active; `'/dashboard/x'` (hypothetical) → not | Overview highlighted everywhere |
| ≤ 2 taps (done-when) | e2e mobile: from `/dashboard` reach `/tasks`, `/requests`, `/goals` via hamburger + link; Requests dialog via dashboard quick action | Future nav change buries a core flow |
| Quick actions are links | `dashboard/page.test.tsx`: `getByRole('link', { name: … })` has `href` | Regress to `router.push` buttons |
| FAQs single title on mobile | `scholar-faqs.test.tsx` asserts the page `h1` has `md:block` + `hidden` class (jsdom has no CSS) | Duplicate title on mobile returns |

Run: `pnpm --filter scholar test`, `pnpm --filter scholar test:e2e` (Playwright, needs API + DB),
`pnpm check:flow-coverage` (should be silent for PR 1), `pnpm --filter @ashinaga/qa-skill test` for PR 2.

## Performance review

No data fetching changes. Nav render is O(11). Converting quick actions to `<Link>` enables Next.js
prefetch of 3 routes on the dashboard — negligible, and the same routes are already prefetched by the
sidebar links. No N+1, caching or memory concerns.

## NOT in scope

- New routes, nested/detail pages, or breadcrumbs.
- Mobile bottom tab bar, account menu, "Home" rename (Phase 3, evidence-gated).
- Staff portal nav (ASH-65 territory, already resolved).
- Proposal visibility rule for enrolled scholars (P11) — needs a product decision; track separately.
- Dashboard redesign beyond quick-action semantics; "New Announcements" count (P10).
- Notification deep links / API `href` values.
- User research itself (ASH-67/68/69/70).

## Open questions

1. **Ops:** Do scholars recognise "LDF"? "Goals" vs "LDF goals" vs keep "My LDF".
2. **Ops:** Approve dropping "My" across labels, and the group names "My programme" / "Updates & help".
3. **Product:** Should enrolled scholars see Proposal (P11)?
4. **Product:** "Overview" or "Home"? (Ticket says "home screen"; staff uses "Overview".)
5. Is there any support-ticket evidence outside Linear (email, Teams) that should reorder priorities
   before PR 1? If not, proceed on code evidence and let ASH-68/69/70 drive Phase 3.
