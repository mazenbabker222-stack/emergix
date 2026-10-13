# 06 — OSCE stations and simulator

```text
PHASE 06 — OSCE STATIONS AND SIMULATOR
Context: read docs/PLATFORM_PLAN.md (sections 5.4, 6, 8) and follow the master rules.
Prerequisite: Phase 05 passed.

GOAL
Migrate the five existing neurology HTML stations into structured data and build a
professional OSCE practice experience, preserving the strengths of the originals.

TASKS
1. Study the existing files artifacts/oscepass/public/neurology/*.html (Stroke and TIA,
   Subarachnoid haemorrhage, Cauda equina syndrome, First seizure, Meningitis). Design the
   osce_stations content JSON (aim and outcomes; candidate instructions; actor brief;
   examiner expectations Do/Find/Ask/Manage/React; "if this happens" table; plain-language
   words; patient/relative questions with model replies; examiner questions with model
   answers; red flags; common errors) and osce_marking_domains (domain, descriptors, max marks).
2. Write a migration script that parses the HTML and loads each station into the DB
   PRESERVING wording. Produce a verification report comparing section counts per station.
3. Station library (/app/osce, plus a public preview page): filters by specialty/topic,
   search, difficulty, status, "ready/coming soon" badges (the neurology hub topic list
   becomes the topic tree; non-ready topics appear as "coming soon").
4. Station viewer (/app/osce/:slug): Learning mode and Exam mode, Candidate view and
   Examiner view, collapsible sections with expand/collapse all, phase timers (reading,
   history, examiner questions) with audible/visual warnings, examiner marking sheet by
   domain with live total (/20 where defined) and global rating (Clear pass / Pass /
   Borderline / Fail), clear marks, save attempt, self-assessment history.
5. Circuit mode (/app/osce/circuit/:id): chain up to 16 stations with reading minute, 8-minute
   stations and 2 rest stations, strict server-validated timing, progress bar, final
   report with per-station and per-domain scores.
6. Partner rooms: create a room link; one user is Candidate, the other Examiner and sees
   the marking sheet; realtime sync of timer and phase (Server-Sent Events or WebSocket).
7. Printable/PDF export of a station (candidate sheet and examiner sheet).
8. Redirects: /neurology -> /osce-stations?topic=neurology and /neurology/:station ->
   /osce-stations/:slug; keep old URLs working. Remove the old static HTML only after
   verification and report what was removed.
9. Tests: unit tests for scoring and timers; Playwright for both modes and views, circuit
   happy path, and redirects.

ACCEPTANCE CHECKS
- All five stations render from the DB with content matching the originals.
- Marking totals and global rating persist across refresh.
- Circuit mode enforces timing even if the browser is refreshed.
- Old /neurology URLs redirect correctly.
- axe passes; works at 360px width; typecheck and tests pass.

REPORT using the format in the master prompt, then stop.
```
