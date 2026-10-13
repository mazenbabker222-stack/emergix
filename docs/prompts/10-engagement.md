# 10 — Engagement features

```text
PHASE 10 — ENGAGEMENT FEATURES
Context: read docs/PLATFORM_PLAN.md (sections 5.2, 5.4, 9) and follow the master rules.
Prerequisite: Phase 09b passed.

GOAL
Increase retention and study efficiency with smart, privacy-respecting features.

TASKS
1. Flashcards: auto-generate from question key learning points and manual cards;
   SM-2 spaced repetition scheduling; daily review queue; deck by topic.
2. Study planner: pick exam date and weekly hours; generate a weekly plan from weak
   topics, lessons and quizzes; calendar view; mark items done; email/push reminders.
3. Dashboard: daily goal, streak (timezone-aware), exam countdown, weak-topic suggestions,
   "continue learning" card.
4. Peer benchmarking: nightly job builds anonymous score distributions per exam/topic;
   learner sees their percentile and a histogram; show only when sample size is large
   enough (configurable minimum) and state this clearly.
5. Notifications: email preferences centre; onboarding sequence; inactivity nudge;
   weekly progress summary; all with unsubscribe and consent tracking.
6. Referral codes and credits (admin-configurable reward).
7. Community (optional, behind a feature flag): per-question discussion, upvotes,
   moderation tools, report/hide.
8. OPTIONAL — AI examiner/tutor (feature flag, off by default): use the Claude API
   server-side only, grounded strictly on the station or question content stored in the
   DB, with a system prompt that forbids inventing clinical facts, per-user rate limits,
   cost caps, conversation logging with retention policy, and a visible
   "educational use, not clinical advice" disclaimer. Provide admin controls to disable it.
9. Tests: unit tests for SM-2 and percentile logic; Playwright for flashcard review and
   planner generation.

ACCEPTANCE CHECKS
- SM-2 intervals match the reference algorithm in tests.
- Benchmark hides itself below the minimum sample size.
- Unsubscribe links work and are honoured by all senders.
- AI features are disabled unless the flag is on, and cannot exceed rate/cost limits.
- typecheck and tests pass.

REPORT using the format in the master prompt, then stop.
```
