# Exam Platform — Product & Technical Specification

> Adapted to the **existing monorepo (formerly named OSCEPASS)** (Vite + React + wouter + shadcn/ui, Express 5, Drizzle + Postgres, OpenAPI + Orval, pnpm workspaces, Replit).
> Goal: evolve the current site into a **comprehensive, professional exam-preparation platform** with learner area, question bank, OSCE station simulator, courses and video, subscriptions, and a full **admin panel**.

**Originality and compliance rule:** build the structure and features, never copy third-party text, questions, branding or images. All medical content is authored or licensed by the owner and clinician-reviewed. The platform is **not affiliated with or endorsed by the Royal College of Emergency Medicine (RCEM)**; show this disclaimer in the footer and on exam pages.

---

## 1. How to use this specification

1. Keep this file in the repo as `docs/PLATFORM_PLAN.md` so the AI builder can re-read it.
2. Use the phase prompts in `docs/prompts/` (paste `00-master` once, then one phase at a time).
3. Do not move to the next phase until the current phase's acceptance checks pass.

---

## 2. Current baseline (verified from the project source; brand name is being changed to "Exam Platform")

| Area | What exists today | Implication |
|---|---|---|
| Monorepo | `artifacts/oscepass` (frontend), `artifacts/api-server` (Express 5), `artifacts/mockup-sandbox`, `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`, `scripts` | Keep this structure; add code to the right package |
| Frontend | Vite, React, Tailwind v4, wouter, shadcn/ui (full component set incl. Accordion, Tabs, Table, Chart, Sidebar), react-query, react-hook-form, zod, recharts, framer-motion, sonner, next-themes | Reuse; no new UI framework |
| Pages | Home, Courses, Practice, Resources, About, Contact, Login, Signup, Neurology hub, Station page | Login/Signup are UI only; most pages are static marketing |
| Code layout | Nearly everything lives in one `App.tsx` | **Split into `pages/`, `components/`, `features/`** before adding more |
| API | Only `GET /api/healthz` | All business APIs must be built |
| Database | `lib/db/src/schema/index.ts` is empty | Design the full schema |
| Content | 5 neurology OSCE stations as static HTML in `public/neurology/` (Stroke/TIA, SAH, Cauda equina, First seizure, Meningitis) with learning mode, exam mode, timer, marking sheet, examiner view | Migrate to structured DB content |
| Duplicates | `public/assets` vs `public/brand` images; `curriculum.html` and `MRCEM_Neurology__…html` match `index.html` by size; `*-station_<digits>.html` copies | Verify with `diff`, then delete duplicates |
| Config | `vite.config.ts` requires `PORT` and `BASE_PATH`; API needs `DATABASE_URL`; `replit.md` is an empty template | Document env vars; fill `replit.md` |
| Tooling | `pnpm run typecheck`, `pnpm --filter @workspace/api-spec run codegen`, `pnpm --filter @workspace/db run push` | These are the project's source-of-truth workflows |

---

## 3. Target product

**One platform, any exam.** The exam model is data-driven so new exams (e.g. FRCEM, other colleges) can be added from the admin panel without code. Launch with three exams:

| Exam | Format | Simulator preset |
|---|---|---|
| MRCEM Primary | 180 SBA, 1 section, 3 hours | Timed paper, 180 min |
| MRCEM SBA (Intermediate) | 180 SBA, 2 sections, 4 hours | 2 × 120 min with 60 min break |
| MRCEM OSCE | 16 stations × 8 min + 1 min reading, 2 rest stations (≈ 2 h 42 min) | Circuit simulator with timers |

(Admin must be able to edit these figures, since official details change; always link to the official college page for the source of truth.)

**Audience:** doctors preparing for emergency medicine membership exams.
**Language:** English (UK). i18n-ready structure for a future Arabic (RTL) version.
**Quality bar:** fast, accessible (WCAG 2.2 AA), secure, mobile-first, installable PWA, polished like world-class learning platforms.

---

## 4. Architecture and project conventions

### 4.1 Stack decisions (keep existing, add only what is needed)
| Concern | Decision |
|---|---|
| Frontend | Existing Vite + React + wouter + shadcn/ui + react-query. Public pages pre-rendered for SEO (e.g. `vite-plugin-ssg`/prerender step), app pages client-rendered |
| API | Express 5 routers under `artifacts/api-server/src/routes/`, one file per domain, validated with the generated Zod schemas |
| Contract | **OpenAPI is the source of truth.** Edit `lib/api-spec/openapi.yaml` → run codegen → use generated hooks in the frontend. Do **not** change the `info.title` (`Api`) |
| Database | Drizzle ORM, one file per table group in `lib/db/src/schema/`, `drizzle-zod` insert schemas, Zod from `zod/v4` |
| Auth | Better Auth (Drizzle adapter) with httpOnly secure session cookies, email verification, password reset, Google login, optional 2FA. No tokens in localStorage |
| Authorisation | Server-side RBAC middleware: `learner`, `instructor`, `editor`, `admin`, `superadmin`. Never trust the client |
| Payments | Stripe Checkout + Billing + Customer Portal + signed webhooks (raw body route) |
| Video | Mux (direct uploads, signed playback, captions); fallback: Cloudflare Stream |
| Files | S3-compatible object storage with signed URLs (PDFs, images, attachments) |
| Email | Resend + React Email templates |
| Jobs | Lightweight queue (pg-boss on Postgres) for emails, transcoding webhooks, daily analytics rollups |
| Security middleware | helmet, express-rate-limit, CORS allow-list, CSRF protection for cookie auth, pino-http (already present) |
| Monitoring | Sentry (web + API), structured pino logs, `/api/healthz` + `/api/readyz` |
| Testing | Vitest (unit), Playwright (e2e), axe-core (a11y), API integration tests with a test database |

### 4.2 Target folder structure
```
artifacts/
  oscepass/src/
    app/                 router, providers, layouts (Public, App, Admin)
    pages/               public/, app/, admin/, auth/
    features/            exams, qbank, osce, courses, billing, analytics, admin-*
    components/          ui/ (shadcn), shared/ (QuestionCard, Timer, VideoPlayer, DataTable…)
    lib/                 api client wrapper, auth hooks, utils
  api-server/src/
    routes/              auth, exams, questions, quizzes, osce, courses, progress,
                         billing, webhooks, admin/*
    middlewares/         auth, rbac, rateLimit, validate, error
    services/            business logic (no Express types)
    jobs/                queue workers
lib/
  db/src/schema/         users.ts, exams.ts, questions.ts, quizzes.ts, osce.ts,
                         courses.ts, billing.ts, content.ts, audit.ts …
  api-spec/openapi.yaml
docs/PLATFORM_PLAN.md
```

### 4.3 Engineering rules
- Strict TypeScript; `pnpm run typecheck` must pass at the end of every phase.
- After any change to `openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- After any schema change, run `pnpm --filter @workspace/db run push` (dev) and add a migration file for production.
- Small commits, one concern each; never commit secrets; maintain `.env.example`.
- Update `replit.md` (stack, repo map, gotchas, env vars) at the end of each phase.

---

## 5. Feature specification

### 5.1 Public website
- **Header/mega-menu:** Exams, Courses, Question Bank, OSCE Stations, Pricing, Resources, About, Help; Sign in / Start free. Sticky, keyboard-accessible, mobile drawer.
- **Exam pages** (one per exam, data-driven): exam type, format, questions, sections, duration, location, content; comparison table in the order Primary → SBA → OSCE; **FAQ accordion** (who can sit it, booking, dates, cost, location, structure, marking and standard setting, results timing); downloadable PDFs; dismissible announcement banner; link to the official college page.
- **Exam calendar and fees** page (admin-editable) with `.ics` export.
- **Pricing** (plans per exam, comparison, FAQ), **Free demo** (limited questions and one lesson without login), testimonials (real, consented only), blog/news, About, Contact (stored + emailed), Help Centre, legal pages (Terms, Privacy, Cookies, Refunds, Medical disclaimer).
- SEO: unique title/description per page (existing `usePageMeta` hook is the base), Open Graph, JSON-LD (Organization, Course, FAQPage), `sitemap.xml`, `robots.txt`, canonical URLs.
- Cookie-consent banner; footer with socials, contact, quick links and the non-affiliation disclaimer.

### 5.2 Learner area (`/app/*`)
1. **Dashboard:** continue learning, daily goal and streak, exam countdown, weak-topic suggestions, recent results.
2. **Question bank** (see 5.3).
3. **OSCE station library and simulator** (see 5.4).
4. **Courses and lectures** (see 5.5).
5. **Flashcards** with spaced repetition (SM-2), auto-generated from question key points.
6. **Notes and bookmarks** across questions, lessons and stations.
7. **Study planner:** choose exam date, auto-generated weekly plan, calendar view, email reminders.
8. **Analytics:** overall and per-topic performance, trends, time per question, readiness indicator, **peer benchmark histogram** (anonymous, refreshed daily).
9. **Account:** profile, target exam/date, subscription and invoices, active sessions/devices, data export, account deletion.

### 5.3 Question bank (core)
- **Question types:** SBA (primary), image-based (ECG, X-ray, photos), extended matching; schema ready for multi-select.
- **Per question:** stem, optional media, 4–5 options, correct option, per-option rationale, teaching notes, key learning point, references, linked lessons, tags (exam, topic, subtopic, difficulty, year, source), status, version.
- **Modes:** Tutor (instant feedback); Timed exam (custom count/time plus presets 180Q/3h and 180Q/2×2h with break); Custom builder (topic, difficulty, unseen/incorrect/flagged); Mistake review queue.
- **Tools:** flag, strike-through options, highlighter, notes, calculator, lab-values panel, font size, report-an-error, question palette, keyboard shortcuts (1–5 answer, N next, P previous, F flag).
- **Integrity:** sessions resume after refresh or disconnect; timer is **server-authoritative**; answers autosave.
- **Review:** score, per-topic breakdown, time per question, explanations, retry incorrect.
- **Quality loop:** per-question statistics (% correct, difficulty index, discrimination, most-chosen distractor) feeding the admin editor.

### 5.4 OSCE station library and simulator
Migrate the five existing neurology HTML stations into structured data and keep their strengths: **Learning mode** and **Exam mode**, **Candidate view** and **Examiner view**, countdown timer with reading and history phases, examiner marking sheet (domain scoring, total /20, global rating: Clear pass / Pass / Borderline / Fail).

Station content model (sections stored as structured JSON): aim and learning outcomes; candidate instructions; actor brief; examiner expectations (Do / Find / Ask / Manage / React); "if this happens, react like this" table; plain-language words; patient/relative questions with model replies; examiner questions with model answers; red flags for examiners; common errors; marking domains.

Features: filter by specialty/topic, station catalogue beyond neurology, **circuit mode** (chain 16 stations with rest stations and strict timing), partner mode (two learners: one candidate, one examiner, shareable room link), saved marks and self-assessment history, printable PDF of a station.
**Optional (phase 9):** AI examiner/actor practice built on the Claude API, grounded only on the station's own content, with logging, rate limits and a clear "educational use" disclaimer.

### 5.5 Courses, lectures and video
- Hierarchy: **Course → Module → Lesson**, mapped to the exam syllabus topics.
- Lesson types: video, article (rich text/Markdown), PDF/slides, audio, downloadable resource, embedded quiz.
- Video player: HLS adaptive streaming, speed control, captions, chapters, resume position, picture-in-picture, keyboard shortcuts, learner-email watermark, download disabled.
- Progress per lesson/module/course, timestamped notes, completion certificates (PDF), free-preview lessons for marketing.
- Live-session entries (link + date) with recordings attached later.

### 5.6 Billing and access
- Plans per exam (e.g. 1/3/6/12 months), bundles, free tier/demo, optional trial, coupons, regional pricing, institution/group licences with seat management.
- Access control by entitlement (active subscription for exam X unlocks its questions, courses, stations).
- Stripe webhooks keep subscription state in sync (idempotent handlers); invoices via Customer Portal; refund handling from admin.
- Anti-sharing: concurrent session limit, device list, new-device alert email.

### 5.7 Admin panel (`/admin/*`) — must be complete enough to run the business without a developer
| Module | Capabilities |
|---|---|
| **Dashboard** | Signups, active users, MRR/revenue, churn, questions answered, video watch time, top/bottom questions, open reports |
| **Exams** | CRUD exams, formats, FAQs, dates/fees, banners, downloadable files, reorder |
| **Question manager** | Create/edit with rich editor and image upload, bulk tag, **CSV/JSON import and export** (with dry-run validation report), duplicate detection, versioning and history, workflow **Draft → Review → Approved → Published**, reviewer assignment, per-question statistics, user-reported errors inbox |
| **Taxonomy** | Topic tree editor, difficulty and source lists, syllabus mapping |
| **OSCE station editor** | Structured form for every station section, marking-domain builder, preview in both modes, publish workflow |
| **Course builder** | Drag-and-drop modules/lessons, direct video upload with processing status, caption upload, attachments, preview as learner |
| **Content/CMS** | Pages, blog, testimonials, FAQs, legal pages, announcement banners, SEO fields |
| **Users** | Search/filter, profile, activity, grant/revoke access, change role, suspend, **impersonate (audited)**, GDPR export/delete |
| **Billing** | Plans, prices, coupons, subscriptions, invoices, refunds, institution licences |
| **Support** | Contact messages, error reports, internal notes |
| **Marketing** | Email campaigns/templates, onboarding sequence, referral codes |
| **Media library** | Upload, tag, search, usage tracking |
| **System** | **Audit log** (who did what, when), feature flags, site settings, email templates, role/permission matrix, health status, backups info |

Admin UX standards: server-side pagination, sorting, filters and saved views on every table; bulk actions with confirmation; optimistic updates with undo toasts; keyboard-friendly; every destructive action confirmed and audited.

---

## 6. Data model (Drizzle tables, grouped by file)

- **users.ts:** `users`, `sessions`, `accounts` (OAuth), `verifications`, `user_profiles` (country, specialty, target exam/date), `devices`
- **exams.ts:** `exams`, `exam_faqs`, `exam_dates`, `exam_documents`, `banners`
- **taxonomy.ts:** `topics` (self-referencing tree), `tags`
- **questions.ts:** `questions`, `question_options`, `question_versions`, `question_topics`, `question_lessons`, `question_reports`, `question_stats` (daily rollup)
- **quizzes.ts:** `quiz_sessions`, `quiz_session_questions`, `quiz_answers`, `question_flags`, `question_notes`
- **osce.ts:** `osce_stations` (metadata + `content` jsonb), `osce_marking_domains`, `osce_attempts`, `osce_circuits`, `osce_rooms`
- **courses.ts:** `courses`, `modules`, `lessons`, `lesson_progress`, `lesson_notes`, `media_assets`, `certificates`, `live_sessions`
- **learning.ts:** `flashcards`, `card_reviews`, `study_plans`, `study_plan_items`, `bookmarks`
- **billing.ts:** `plans`, `plan_prices`, `subscriptions`, `entitlements`, `coupons`, `coupon_redemptions`, `invoices`, `licences`, `licence_seats`, `webhook_events`
- **content.ts:** `pages`, `blog_posts`, `testimonials`, `contact_messages`, `email_templates`, `email_log`, `feature_flags`, `settings`
- **audit.ts:** `audit_log` (actor, action, entity, before/after, ip, timestamp)

Rules: UUID or bigint ids consistently; `created_at`/`updated_at` everywhere; soft-delete for content; indexes on `(user_id, created_at)`, `(question_id)`, `(topic_id)`, `(exam_id, status)`; foreign keys with sensible cascade; unique constraints for idempotency (e.g. `webhook_events.stripe_event_id`).

---

## 7. API surface (OpenAPI tags)

`auth`, `me`, `exams`, `topics`, `questions`, `quizzes`, `osce`, `courses`, `progress`, `flashcards`, `planner`, `analytics`, `billing`, `webhooks`, `contact`, `content`, and `admin` (sub-tags per admin module).
Conventions: REST + JSON, cursor pagination, consistent error shape `{ error: { code, message, details } }`, idempotency keys on payment-related POSTs, rate limits per route group, all request/response bodies defined in `openapi.yaml`.

---

## 8. Frontend routes

**Public:** `/`, `/exams`, `/exams/:slug`, `/calendar`, `/courses`, `/courses/:slug`, `/question-bank`, `/osce-stations`, `/osce-stations/:slug` (preview), `/pricing`, `/free-demo`, `/blog`, `/blog/:slug`, `/resources`, `/about`, `/contact`, `/help`, `/legal/:page`
**Auth:** `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`
**Learner (`/app`):** `/app`, `/app/qbank`, `/app/qbank/new`, `/app/qbank/session/:id`, `/app/qbank/review/:id`, `/app/osce`, `/app/osce/:slug`, `/app/osce/circuit/:id`, `/app/courses`, `/app/courses/:course/:lesson`, `/app/flashcards`, `/app/notes`, `/app/planner`, `/app/analytics`, `/app/account`, `/app/billing`
**Admin:** `/admin` plus one route group per module in Section 5.7
**Keep** the existing `/neurology` and `/neurology/:station` URLs working via redirects to the new station routes.

---

## 9. Non-functional requirements

**Security:** HTTPS only; secure httpOnly SameSite cookies; CSRF protection; Zod validation on every input; parameterised queries only (Drizzle); strict CSP; rate limiting and lockout on auth; password hashing (Argon2/bcrypt via the auth library); signed expiring URLs for video/files; server-side authorisation on **every** endpoint; audit log for admin actions; secrets only in environment variables; dependency audit in CI.
**Privacy:** UK-GDPR/GDPR — consent banner, privacy policy, data export and deletion, minimal data, processor list.
**Accessibility:** WCAG 2.2 AA, focus management in dialogs, ARIA for accordions/tabs, captions on videos, contrast checks, reduced-motion support, full keyboard operation of the question and OSCE interfaces.
**Performance:** Lighthouse ≥ 90, LCP < 2.5 s, CLS < 0.1, route-level code splitting, responsive images (WebP/AVIF), cached API reads, DB indexes verified with `EXPLAIN`.
**Reliability:** autosave, resumable sessions, idempotent webhooks, graceful error boundaries (an `ErrorBoundary` component already exists), backups with a tested restore.
**Observability:** Sentry, pino logs with request ids, product analytics (PostHog), admin health view.
**Medical safety:** educational-use disclaimer, "last reviewed" date and reviewer on every question/station, mandatory review workflow before publishing.

---

## 10. Delivery roadmap and acceptance criteria

| Phase | Prompt file | Scope | Done when |
|---|---|---|---|
| 01 | `01-foundation-rebrand.md` | Rebrand to Exam Platform, cleanup, split `App.tsx`, env docs, CI, `replit.md` | App runs identically; typecheck passes; duplicates removed |
| 02 | `02-database-contract.md` | DB schema, OpenAPI contract, codegen, seed | `db push` and codegen succeed; seed creates demo data |
| 03 | `03-auth-roles.md` | Auth, roles, RBAC, account page, email flows | Signup → verify → login → logout works; role guards tested |
| 04 | `04-public-site.md` | Public site: exam pages, FAQ accordions, calendar, pricing, legal, SEO | Pages data-driven from DB; Lighthouse ≥ 90 |
| 05 | `05-question-bank.md` | Question bank engine + learner UI + analytics v1 | Learner completes timed 180Q mock; resumes after refresh |
| 06 | `06-osce-simulator.md` | OSCE stations migration + simulator + circuit mode | All 5 stations render from DB with both modes and marking sheet |
| 07 | `07-courses-video.md` | Courses, video upload/playback, progress, notes, certificates | Admin uploads video; learner watches, resumes, completes |
| 08 | `08-billing.md` | Billing, entitlements, coupons, customer portal | Test-mode purchase unlocks content; cancel/refund syncs |
| 09a | `09a-admin-core.md` | Admin shell, dashboard, exams, questions, taxonomy | 500-question import and publish workflow works |
| 09b | `09b-admin-content-users.md` | Stations, courses, CMS, users, billing, support, marketing, system | Non-developer can run content, users and billing end to end |
| 10 | `10-engagement.md` | Flashcards, planner, benchmarking, notifications, optional AI | Features pass e2e; AI is grounded and rate-limited |
| 11 | `11-hardening-launch.md` | A11y audit, security review, load test, PWA, runbook | No critical/high findings; restore verified |

**Global Definition of Done (every phase):** typecheck passes; codegen and schema in sync; unit + integration tests for new services; Playwright test for the main user flow; axe has no serious violations; no secrets committed; `replit.md` and `.env.example` updated; short phase summary written.

---

---

## 11. What the owner must prepare

- **Brand:** final name (working name: Exam Platform), logo, colours, domain, support email.
- **Accounts:** Stripe, Mux (or Cloudflare Stream), Resend, Sentry, S3-compatible storage, production Postgres.
- **Content:** authored/licensed questions with explanations and references; recorded lectures with captions; OSCE stations in the structured format; clinician reviewers.
- **Legal:** Terms, Privacy, Refund policy, medical disclaimer, trademark check for exam names, company/VAT details.
- **Decisions:** pricing per exam and region, free-tier limits, refund policy, whether to enable the AI examiner.
