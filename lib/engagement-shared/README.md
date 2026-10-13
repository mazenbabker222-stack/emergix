# @workspace/engagement-shared (Phase 10 — domain logic)

Pure TypeScript, shared by API and web. No database, no network, clock always injected.

| File | What it does | Phase 10 task |
|---|---|---|
| `sm2.ts` | SM-2 scheduling, 4-grade mapping, daily review queue | 1 flashcards |
| `planner.ts` | `generatePlan` weekly plan from weak topics, `planCompletion` | 2 planner |
| `streak.ts` | timezone-aware streak, daily goal, exam countdown | 3 dashboard |
| `benchmark.ts` | percentile + histogram, hidden below min sample (30) | 4 benchmarking |
| `notifications.ts` | consent, signed unsubscribe links (one-click headers), nudge/onboarding rules (server only) | 5 notifications |
| `referral.ts` | codes, abuse checks, admin-configurable reward decision (server only) | 6 referrals |
| `aiGuard.ts` | flag/rate/cost gate, grounded prompt, retention (server only; never calls an API) | 8 AI (optional) |

Notes:
- `flashcards.ease_factor` is `numeric(4,2)`; SM-2 deltas are exact to 2 decimals, so no drift when stored.
- Task 7 (community) is not included: it is pure CRUD and moderation, no domain logic.

Wire-up: `pnpm install`, then `pnpm --filter @workspace/engagement-shared run test`.
