# 02 — Database, API contract and seed

```text
PHASE 02 — DATABASE, API CONTRACT AND SEED
Context: read docs/PLATFORM_PLAN.md (sections 3, 6, 7) and follow the master rules.
Prerequisite: Phase 01 passed.

GOAL
Create the complete data layer and API contract so every later phase builds on a
stable foundation.

TASKS
1. Drizzle schema in lib/db/src/schema/, one file per group, exported from index.ts:
   users, exams, taxonomy, questions, quizzes, osce, courses, learning, billing,
   content, audit (exact tables in section 6 of the plan). Requirements: consistent
   ids, created_at/updated_at, soft-delete on content, foreign keys with deliberate
   cascade rules, indexes listed in the plan, unique constraints for idempotency
   (e.g. webhook_events.stripe_event_id), drizzle-zod insert schemas, exported types.
2. Extend lib/api-spec/openapi.yaml with tags, paths, request/response schemas,
   cursor pagination, the standard error shape { error: { code, message, details } },
   and security schemes. Define paths now; implementations come in later phases.
   Do not change info.title. Run codegen and fix any generation errors.
3. Seed script scripts/src/seed.ts (idempotent, re-runnable):
   - 3 exams (Primary, SBA, OSCE) with format fields, FAQs and sample dates/fees
     (mark fees as PLACEHOLDER).
   - 6 topics (with 2 sub-topics each), difficulty levels.
   - 60 SAMPLE SBA questions with option rationales (clearly marked SAMPLE, not clinical advice).
   - 3 plans with placeholder prices, 2 sample courses with placeholder lessons.
   - Demo users: learner, instructor, editor, admin, superadmin (random passwords printed once, never committed).
   Add `pnpm --filter @workspace/scripts run seed`.
4. Test infrastructure: a separate test database via DATABASE_URL_TEST, helper to
   reset/migrate/seed, and 3 example API integration tests (health, readyz, exams list stub).
5. Generate a migration (drizzle-kit generate) in addition to `push`, and document both.
6. Write docs/DATA_MODEL.md with an ER diagram in Mermaid.

ACCEPTANCE CHECKS
- `db push`, codegen and typecheck succeed from a clean clone.
- Seed runs twice with no duplicates and no errors.
- Row counts after seed match the list above.
- docs/DATA_MODEL.md renders in a Mermaid viewer.

REPORT using the format in the master prompt, then stop.
```
