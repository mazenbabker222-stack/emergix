# 09a — Admin panel (core)

```text
PHASE 09a — ADMIN PANEL, CORE MODULES
Context: read docs/PLATFORM_PLAN.md (sections 5.7, 6, 9) and follow the master rules.
Prerequisite: Phase 08 passed.

GOAL
Build the admin shell and the modules the business needs first: dashboard, exams,
questions and taxonomy. A non-developer must be able to manage these end to end.

SHARED ADMIN FOUNDATION
- AdminLayout with shadcn Sidebar, breadcrumbs, command palette (cmdk) for quick navigation.
- Reusable DataTable: server-side pagination, sorting, filters, saved views, column
  visibility, bulk actions with confirmation, CSV export.
- Form kit (react-hook-form + zod), rich-text editor, image/file uploader to S3.
- Every write endpoint: requireRole, Zod validation, audit_log entry (actor, action,
  entity, before/after, IP). Optimistic updates with undo toast for reversible actions.

MODULES
1. Dashboard: signups, active users (DAU/WAU/MAU), revenue (MRR), churn, questions
   answered, video watch time, top/bottom performing questions, open reports, system status.
2. Exams: CRUD exams and formats, FAQs (drag to reorder), dates/fees, banners with
   schedule, downloadable documents, preview before publish.
3. Question manager: create/edit with rich editor, image upload and alt text, options with
   per-option rationale, tags and topic tree, difficulty, source and year; duplicate
   detection on save; versioning with history and restore; workflow Draft -> Review ->
   Approved -> Published with reviewer assignment and comments; bulk tag/publish/archive;
   per-question statistics panel; reported-errors inbox with resolve/reject.
4. Import/Export: CSV and JSON import with template download, dry-run validation report
   (row-level errors), mapping of topics by name, import in background job with progress;
   export filtered sets.
5. Taxonomy: topic tree editor (drag and drop), difficulty and source lists, syllabus mapping.

TESTS
Unit tests for permission checks and import validation; Playwright: admin imports a
500-row CSV, fixes reported errors, publishes questions, edits an exam FAQ and date,
and a learner sees the changes.

ACCEPTANCE CHECKS
- Import of 500 questions completes with a clear report; invalid rows are not imported.
- Editor can submit for review, reviewer approves, admin publishes; learners only see Published.
- Every admin write appears in the audit log (verified by test).
- Learner/instructor roles cannot access admin endpoints (tests).
- DataTables stay responsive with 10,000 rows; axe passes; typecheck and tests pass.

REPORT using the format in the master prompt, then stop.
```
