---
name: qa-walkthrough
description: On-demand QA walk of every staff and student (Prep Year + enrolled scholar) flow on test or local, with a Pass / Fail / Skip row per flow. Use when asked to QA the app end to end. Not a CI gate and not a replacement for `pnpm test:e2e`.
---

Follow `packages/qa-skill/SKILL.md`. It is the full skill: setup (`.env.example` → `.env.local`),
how to run `pnpm --filter @ashinaga/qa-skill qa`, what Pass / Fail / Skip mean, and how to handle
write steps. The flow list is `packages/qa-skill/catalogue/flows.json`.
