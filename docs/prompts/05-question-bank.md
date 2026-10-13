# 05 — Question bank

```text
PHASE 05 — QUESTION BANK
Context: read docs/PLATFORM_PLAN.md (sections 5.2, 5.3, 6, 9) and follow the master rules.
Prerequisite: Phase 04 passed.

GOAL
Build the core product: a fast, reliable, exam-realistic question bank with analytics.

TASKS
1. API services and routes: list/filter questions, create quiz sessions, fetch next
   questions, submit answers, flag, note, finish, review, retry incorrect. The session
   state and timer are SERVER-AUTHORITATIVE (store start time and limits; reject
   answers after expiry; never send the correct answer before it is allowed by mode).
2. Modes:
   - Tutor: immediate feedback and explanations.
   - Timed exam: custom count/time, plus presets Primary (180 Q / 180 min) and SBA
     (180 Q in 2 x 120 min with a 60 min break; second section locked until break ends).
   - Custom builder: filter by exam, topic/sub-topic, difficulty, unseen, incorrect, flagged.
   - Mistake review queue: automatic list of incorrect and flagged questions.
3. UI (/app/qbank, /new, /session/:id, /review/:id): two-pane desktop layout, single
   column mobile, sticky timer, question palette (answered/flagged/current), tools
   (strike-through, highlighter, notes, calculator, lab-values panel, text size,
   report-an-error), keyboard shortcuts (1-5 answer, N next, P previous, F flag),
   autosave on every answer, resume after refresh/disconnect, confirmation before finishing.
4. Review screen: score, per-topic breakdown, time per question, full explanations with
   per-option rationale, key learning point, references, linked lessons (when present).
5. Analytics v1 (/app/analytics): overall score, per-topic performance, trend over time,
   average time per question, weakest topics with "practise these" shortcut. Daily rollup
   job fills question_stats (% correct, difficulty index, discrimination, distractor counts).
6. Question reports: learners can report an error; goes to the admin inbox (UI in Phase 09a).
7. Access: free demo set available without a subscription; full bank requires entitlement
   (middleware from Phase 03; real entitlements arrive in Phase 08, so use a dev flag until then).
8. Performance: paginate/stream question payloads, prefetch next question, DB indexes
   verified with EXPLAIN on the main queries.
9. Tests: unit tests for scoring and timer rules; integration tests for answer submission
   and expiry; Playwright: complete a 20-question timed session, refresh mid-session and
   resume, and verify the SBA break lock.

ACCEPTANCE CHECKS
- A learner can complete a 180-question timed mock and see correct scoring.
- Closing the browser mid-session and returning resumes with the correct remaining time.
- The API never reveals correct answers in Timed mode before finishing.
- Keyboard-only operation works; axe has no serious violations on the session page.
- typecheck, unit, integration and e2e tests pass.

REPORT using the format in the master prompt, then stop.
```
