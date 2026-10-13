# 11 — Hardening and launch

```text
PHASE 11 — HARDENING AND LAUNCH
Context: read docs/PLATFORM_PLAN.md (sections 9 and 10) and follow the master rules.
Prerequisite: Phase 10 passed.

GOAL
Make the platform production-ready and document how to operate it.

TASKS
1. Accessibility: full audit (keyboard, screen reader, contrast, focus order, reduced
   motion, captions) of public, learner and admin areas; fix all serious issues; add
   axe checks to CI for key pages.
2. Security: review headers and CSP, cookie flags, CSRF, CORS, rate limits; authorisation
   tests for EVERY route (matrix of role x endpoint); dependency audit (`pnpm audit`) and
   fixes; secret scanning; file-upload validation (type, size, content sniffing); SSRF and
   injection checks; ensure no correct answers or signed URLs leak in logs.
3. Performance: load-test critical endpoints (login, question fetch, answer submit, video
   token) with k6 or autocannon; add caching where safe; verify DB indexes and slow queries;
   Lighthouse >= 90 on public pages; bundle analysis and code splitting.
4. Reliability: PWA manifest and service worker (offline shell, no caching of sensitive
   API data); graceful degradation; backup schedule and a TESTED restore; job retry and
   dead-letter handling; /api/readyz covering DB, storage and queue.
5. Observability: Sentry for web and API with release tags, uptime monitor, alert rules,
   structured logs with request ids, product analytics behind cookie consent.
6. Compliance: privacy policy and cookie policy completed (owner to review with counsel),
   data retention settings, data export/delete verified end to end, processor list.
7. Content QA checklist: every published question/station has reviewer and last-reviewed
   date; sample content clearly separated from real content; placeholder legal/pricing
   text removed or flagged.
8. Documentation: docs/RUNBOOK.md (deploy, rollback, backups, incident response, common
   fixes), docs/LAUNCH_CHECKLIST.md, docs/ARCHITECTURE.md, updated replit.md and README.
9. Final regression: run the full unit, integration and e2e suites; produce a final report
   with remaining risks and a post-launch backlog.

ACCEPTANCE CHECKS
- No critical or high findings in the security review; all route-authorisation tests pass.
- Load test meets agreed targets (state them in the report) without errors.
- A restore from backup is demonstrated on a fresh database.
- Lighthouse >= 90 and axe clean on key pages; PWA installable.
- Launch checklist completed, with owner-only items clearly listed.

REPORT using the format in the master prompt, then stop.
```
