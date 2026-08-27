## 7. Conventions Checklist (per ticket)

- [ ] Branch created off `test` · named `ash-<NN>-<slug>`
- [ ] Drizzle migration generated (`pnpm db:generate`) + applied (`pnpm db:migrate`)
- [ ] Unit tests for service/controller added/updated (`*.spec.ts`)
- [ ] `pnpm test` + `pnpm lint` pass
- [ ] PR opened **against `test`**, referencing the ASH ticket
- [ ] `programStage` (`prep_year` / `scholar`) semantics respected; no new account type introduced
- [ ] **Invitation `programStage` flow** (ASH-79 + ASH-80+):
  - [ ] Staff can create scholar invitations with `programStage` (`prep_year` / `scholar`) and intended fields (`intendedUniversity`, `intendedCourse`, `degreePathway`) via `CreateInvitationDto.scholarData`
  - [ ] Scholar signup reads `programStage` from invitation token and pre-fills corresponding form fields
  - [ ] If `programStage` not provided in invitation, scholar sees all fields and fills them manually — backward-compatible
  - [ ] Staff UI `createStaffInvitation(options)` supports passing `programStage` + intended fields; if omitted, scholar gets blank form