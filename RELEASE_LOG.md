# Release Log

Summary of features, bug fixes, and improvements merged to `main` (production) from the beginning of the repository. Ordered by date, newest first.

---

## 2026-02-02

- **Merges:** PR #37 (test)
- **Changes:** Merge from test branch; test and stability updates.

---

## 2026-01-29

- **Merges:** PR #38 (odi-feedback), PR #39–41 (dark-mode-fixes)
- **Features & improvements**
  - ODI feedback: requested product/UX changes from ODI.
  - Dark mode: fixes for light green background and dark mode styling; CORS relaxed for non-production so preview/deployed apps work correctly.
- **Bug fixes**
  - Dark mode background and contrast fixes.
  - CORS issues for staff/scholar apps and preview deployments.
- **Other:** Linting and code cleanup.

---

## 2026-01-21

- **Merges:** PR #35 (dark-mode), PR #36 (cors-vercel-preview)
- **Features**
  - Dark mode added across the platform.
  - CORS updated to allow all Vercel preview deployments.
- **Improvements:** Vercel preview URL handling for API and apps.

---

## 2026-01-20

- **Merges:** PR #33–34 (user-feedback)
- **Features**
  - New request types (e.g. extenuating circumstances, summer funding request/report, requirement submission).
  - Requests routed to a specific staff member (assignment).
  - LDF (goals) updates and improvements.
- **Bug fixes**
  - Migration fix for new request/assignment data.
  - Padding and progress display bug in goals.
- **Improvements:** Goals UX and request handling from user feedback.

---

## 2025-12-19

- **Merges:** PR #30–32 (reset-password, main)
- **Features**
  - Forgot password / reset password flow (staff and scholar).
  - Password reset emails sent in test environment where configured.
- **Improvements:** Auth flows and email configuration.

---

## 2025-12-10

- **Merges:** PR #25 (final-v1-features), PR #26 (test), PR #27 & #29 (boostrap-staff-admin)
- **Features**
  - Staff admin bootstrap: initial staff admin account creation/setup.
  - Main branch deployment enabled for production.
- **Improvements**
  - Next.js upgrade.
  - Postgres 17.5 upgrade.
  - Refactored env var handling for deployment.
  - Swagger/OpenAPI: Bearer auth documented for session token.
- **Bug fixes**
  - Staff bootstrap flow and related fixes.
  - Tests and build fixes after upgrades.

---

## 2025-12-04

- **Features**
  - Request filtering and live form validation.
  - Additional scholar profile fields in API and UI.
  - Requests routed to specific staff members.
  - LDF goals updates (data and behaviour).
- **Improvements:** Request list shows rejected requests; request workflow and assignment.

---

## 2025-10-24

- **Merges:** PR #24 (email-functionality)
- **Features**
  - Email notifications for comments on LDF (goal) items.
  - Scholars receive emails when announcements are sent.
  - Announcements: archive and delete (soft archive + delete).
  - Requests: archived state and delete (backend + UI).
- **Bug fixes**
  - Delete announcement behaviour.
  - Build and test issues in API/apps.
- **Improvements:** Email integration (Resend) and notification behaviour.

---

## 2025-10-23

- **Merges:** PR #23 (ldf-changes)
- **Features**
  - LDF (goals) download: staff can download LDF report/CSV for a scholar.
  - Goal comments: data model, backend API, and front end (staff and scholar).
  - Staff app shows full LDF item (goal) details.
  - New LDF/goal data model fields and new goal fields in scholar app.
- **Bug fixes**
  - Add review comment error.
  - Build and missing import in LDF code.
- **Improvements:** Naming aligned from “goals” to “LDF” in scholar app where appropriate.

---

## 2025-09-21

- **Merges:** PR #15–22 (scholar-overview-page, test, scholar-profile x2, test-env-fixes x2, main)
- **Features**
  - Scholar app: overview/dashboard page.
  - Scholar app: “My profile” page and extended profile fields.
  - Scholar onboarding flow (post-invitation signup and profile completion).
  - Standardised year and university inputs (dropdowns/consistent options).
- **Improvements**
  - Navigation with proper URLs (query params and routes).
  - Scholar profile API and UI fields aligned.
- **Bug fixes**
  - Routing issue in scholar app.
  - Tests and build for scholar and API.
- **Other:** Test env fixes and env vars for deployment.

---

## 2025-09-21 (scholar goals & tasks)

- **Merges:** PR #13 (scholar-app-my-tasks), scholar-goals merge
- **Features**
  - Scholar app: “My goals” (LDF goals) page.
  - Scholar app: “My tasks” page and task completion (submission, attachments).
  - Staff app: task completion info and attachments; attachments downloadable.
- **Improvements:** Task and goal flows for scholars and staff.

---

## 2025-09-20

- **Merges:** PR #11–12 (scholar-app, main)
- **Features**
  - Scholar app: login, dashboard, menu, and core flows.
  - Scholar creation (invitation-based signup and scholar record creation).
  - Staff user creation fixed (invitations and staff records).
- **Bug fixes**
  - Type and build issues.
  - API and scholar app tests.
- **Improvements:** S3 infra (Terraform) and file upload backend; file upload front end; staff can download task attachments.

---

## 2025-09-15 – 2025-09-13

- **Features**
  - Scholar app: requests page; get requests and create request form.
  - Scholar app: announcements page.
  - Scholar app: colours and styling.
  - Scholar app: login page and creation flow.
  - Staff app: login fixes; scholar app login fixes.
  - Invitations API and flow.
  - Only scholars can access scholar app (role check).
- **Bug fixes**
  - Login page errors (staff and scholar).
  - Staff sign up flow.
  - Env var setup for API and apps.
- **Improvements:** Auth and routing so each app serves the correct user type.

---

## 2025-09-12

- **Merges:** PR #10, scholar-app merge
- **Improvements:** Postgres 17.5; test and scholar-app branch integration.

---

## 2025-09-09

- **Merges:** PR #9 (add-features)
- **Features**
  - User profile edit (staff).
  - Task assignment (backend and staff UI).
  - Announcements and tasks: real-time updates (e.g. React Query).
  - Swagger docs update.
- **Improvements**
  - React Query for data fetching and cache.
  - Navigation refactor.
  - Storybook upgrade.
- **Bug fixes**
  - Update profile cancel behaviour.
  - Announcements filter made dynamic (not hardcoded).

---

## 2025-09-08

- **Merges:** PR #1–8 (deploy-test, add-features, test)
- **Features**
  - Tasks backend (API).
  - Auth controller refactored and explicit routes.
  - Dev data population script and API env vars for local/dev.
- **Improvements**
  - Health check endpoint and health check interval for deployment.
  - Logging in API.
  - Build and API URL handling for deployment.
  - Dockerfile: correct NestJS build output path.
  - Deploy workflow: correct `db:migrate` command.
  - Resend env var for email.
- **Bug fixes**
  - TypeScript type for authenticated requests.
  - DB SSL for seed/population script.
  - Test data population script.
  - Build fixes.

---

## 2025-08-27

- **Features**
  - Announcements: full flow (create, recipients, list) end-to-end.
  - Announcements module (API and UI).
  - Request status email sending.
  - Homepage completed (staff app).
  - Scholar detail page (staff app).
  - Forgot password flow (early implementation).
- **Improvements**
  - Requests view and behaviour.
  - Email service tested.
  - Terraform optimised.
  - Auth simplified and fixed.
  - Buttons and UI cleanup.
- **Bug fixes:** Linting and build.

---

## 2025-08-24 – 2025-08-19

- **Improvements**
  - Env vars loading.
  - pnpm upgrade.
  - Dev data population script enhanced.
- **Other:** Terraform playground removed.

---

## 2025-08-13

- **Features**
  - Scholars page: API-connected list and dynamic filters (program, year, university, etc.).
  - Scholars module (API and UI).
  - Sign up (staff).
- **Improvements**
  - Storybook upgrade.
  - Docs cleanup.
- **Bug fixes:** Build and linting.

---

## 2025-08-03

- **Features:** Sign up flow (staff).

---

## 2025-07-31

- **Improvements:** Migrations added; user model refactored and auth integrated (Better Auth).

---

## 2025-07-30

- **Features**
  - Data model and migrations (Drizzle).
  - Populate DB script for development.
- **Bug fixes:** Migrations path/config.

---

## 2025-07-29

- **Features**
  - Staff app init.
  - Student app added and v0 copy cleaned up.
  - Refactor: “Student” renamed to “Scholar” across the codebase.
- **Bug fixes:** Favicon.

---

## 2025-07-25 – 2025-07-24

- **Initial release**
  - Initial commit.
  - Boilerplate and repo setup; deploy to prod on main disabled initially.

---

*This log is generated from the `main` branch history. For exact commits and PRs, refer to the git log and GitHub pull requests.*
