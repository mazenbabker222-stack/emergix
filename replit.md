# Emergix Academy

An exam-preparation and learning platform for emergency medicine clinicians, with public learning pages, OSCE practice, learner accounts and an administration workspace for courses and learning materials. Specification: `docs/PLATFORM_PLAN.md`. Phase prompts: `docs/prompts/`.

## Run & Operate

- `pnpm install` — install (use pnpm only; npm/yarn are blocked by `preinstall`)
- `pnpm --filter @workspace/api-server run dev` — API server (needs `PORT`, `DATABASE_URL` for DB routes)
- `pnpm --filter @workspace/oscepass run dev` — web app (**needs `PORT` and `BASE_PATH`**, see Gotchas)
- `pnpm run typecheck` — typecheck all packages
- `pnpm run lint` / `pnpm run format:check` — ESLint / Prettier
- `pnpm run test` — Vitest unit tests; `pnpm run test:e2e` — Playwright smoke test
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from `openapi.yaml`
- `pnpm --filter @workspace/db run push` — push DB schema (dev only); `generate` creates SQL migrations
- `pnpm --filter @workspace/db run generate` writes SQL migrations to `lib/db/migrations` (commit them); `migrate` applies them (production)
- `pnpm --filter @workspace/scripts run seed` — idempotent demo seed (prints demo passwords once); `seed:check` also verifies row counts on a clean DB
- Initial administrator: set `ADMIN_EMAIL` and a one-time `ADMIN_BOOTSTRAP_TOKEN` in Replit settings, then complete `/setup/admin` once. Enter the account password only in that form and remove the bootstrap token after setup.
- Env vars: see `artifacts/api-server/src/config/env.ts`; use Replit Secrets for secret values.

## Stack

pnpm workspaces · Node 24 · TypeScript 5.9 · Vite + React 19 + wouter + shadcn/ui + Tailwind v4 + react-query (web) · Express 5 + pino (API) · Drizzle + Postgres · Zod (`zod/v4`) · Orval codegen from OpenAPI · esbuild (API bundle) · ESLint 9, Prettier, Vitest, Playwright, GitHub Actions.

## Where things live

- `artifacts/oscepass/` — web app (folder/package name kept for Replit; see Gotchas)
  - `src/config/brand.ts` — **only** place the brand name, tagline, support details and disclaimer live
  - `src/config/navigation.ts` — header navigation
  - `src/app/` — `App.tsx`, `Router.tsx`, `providers.tsx`
  - `src/pages/` — one file per page; `pages/app/` (learner area `/app`, `/app/account`) and `pages/admin/` (`/admin`)
  - `src/features/auth/` — `AuthProvider`, route guards (`RequireAuth`, `GuestOnly`), forms; `src/features/account/` — account sections; `src/components/layouts/` — `PublicLayout`, `AppLayout`, `AdminLayout`
  - `src/features/` — feature code and data (`neurology/data.ts`, `home/data.ts`, `auth/AuthPage.tsx`)
  - `src/components/shared/` — Header, Footer, SiteLayout, Brand, Reveal, PageHero, VideoModal; `components/ui/` is shadcn
  - `public/neurology/*.html` — static OSCE stations + `curriculum.html` (migrate to DB in phase 06)
  - `public/brand/` — images, `wordmark.svg`, `wordmark-light.svg`; `public/favicon.svg`
  - `e2e/` — Playwright specs
- `artifacts/api-server/src/` — Express API
  - `lib/auth.ts` Better Auth config (served at `/api/auth/*`, not in OpenAPI); `lib/lockout.ts`, `lib/sessionLifecycle.ts`, `lib/mailer.ts`, `emails/` (React Email)
  - `middlewares/` — `session.ts` (loads `req.auth`), `rbac.ts` (`requireAuth`, `requireRole`, `requirePermission`, `requireEntitlement` stub), `csrf.ts`
  - `routes/` — `health.ts`, `account.ts` (`/api/account/*`), `admin.ts` (`/api/admin/*`, staff only)
- `lib/api-spec/openapi.yaml` — API contract (source of truth) → `lib/api-zod`, `lib/api-client-react` (generated, do not edit)
- `lib/db/src/schema/` — Drizzle schema, one file per group: `users.ts` (auth tables, text ids, short export names like `users`) and `audit.ts` from phase 03; `exams, taxonomy, courses, questions, quizzes, osce, learning, billing, content` from phase 02 (`xxxTable` names, uuid ids, insert schemas + types per table); `_helpers.ts` has `pk()`, `timestamps`, `softDelete`
- `lib/db/src/seed/` — seed data + `runSeed()` (`@workspace/db/seed`); `lib/db/src/testing.ts` — `resetTestDatabase()` (`@workspace/db/testing`, needs committed migrations; the phase 03 tests use a pushed DB instead)
- `docs/DATA_MODEL.md` — ER diagrams (Mermaid) and FK rules
- `lib/auth-shared/` — roles and the central permission matrix (`permissions.ts`), used by API and web
- `lib/engagement-shared/` — phase 10 domain logic: SM-2, study-plan generator, streaks, peer benchmark, notification consent + unsubscribe tokens, referrals, AI guard (see its README); DB tables, API routes and UI are not built yet
- `lib/hardening-shared/` — upload validation (magic bytes), log redaction, `/api/readyz` aggregation; standalone part of phase 11 (not yet wired into `app.ts`)
- `docs/` — specification and phase prompts

## Architecture decisions

- Auth: Better Auth with httpOnly SameSite=Lax cookies (Secure in production); no tokens in browser storage. Roles live in `users.role`; every check goes through `lib/auth-shared` permissions. Sign-in lockout (`auth_lockouts`), per-IP rate limits, session cap (`MAX_SESSIONS`), new-device e-mail alerts and an append-only `audit_log`.
- The web app and API must share one origin (platform router in production, Vite `/api` proxy locally) so cookies work; set `APP_URL` to that origin.
- OpenAPI is the contract; never hand-write API types. Keep `info.title: Api`.
- `index.html` uses `%BRAND_*%` placeholders filled by a Vite plugin from `brand.ts`.
- `/api/readyz` imports `@workspace/db` lazily so `/api/healthz` (liveness) works without a database.
- Station pages are still static HTML in an iframe; `/neurology` and `/neurology/:station` URLs must keep working when stations move to the DB.

## Data and API conventions (phase 02)

- Phase 02 tables: UUID primary keys, `created_at`/`updated_at`, `deleted_at` soft delete on content. Columns that point at users are `text` (Better Auth ids). Auth tables were only extended with nullable/defaulted columns (see `docs/DATA_MODEL.md`).
- `openapi.yaml` is the full contract (all tags, cursor pagination `{ data, nextCursor }`, error shape `{ error: { code, message, details } }`, `cookieAuth` scheme, `x-required-role` minimum role per operation). Implemented: health, `/account/*`, `/admin/ping`, `/admin/users/{userId}/role` (phase 03) and a stub `GET /exams`. Better Auth `/api/auth/*` stays outside the spec. Register static admin paths (e.g. `/admin/questions/import`) before `/{id}` routes in Express.
- Seeded content is SAMPLE/PLACEHOLDER only. Demo users (`@demo.emergix-academy.example`, email verified) have random passwords printed once by the seed.

## Gotchas

- `vite.config.ts` throws unless **`PORT`** and **`BASE_PATH`** are set (Replit supplies them from `artifact.toml`; locally use e.g. `PORT=5173 BASE_PATH=/`).
- Internal names still say `oscepass` on purpose: folder `artifacts/oscepass`, package `@workspace/oscepass`, artifact id in `.replit-artifact/artifact.toml`, and the lockfile. Renaming risks breaking Replit workflows; do it as a separate, deliberate step.
- Vite emits bundles to `dist/public/assets/`; do not create `public/assets`.
- Adding dependencies: `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440`.
- `scripts/post-merge.sh` runs `pnpm install --frozen-lockfile`, so commit an up-to-date `pnpm-lock.yaml` whenever `package.json` changes.
- The `.example` domain in `brand.ts` is intentionally a placeholder. Set the verified production origin before launch.
- All exam pages and the footer must show: "Not affiliated with or endorsed by the Royal College of Emergency Medicine."

## Phase status

- Phase 01 (rebrand, cleanup, foundation): done.
- Phase 03 (auth and roles): implemented.
- Phase 02 (database, API contract, seed): merged on top of phase 03. Still to run on a machine with pnpm + Postgres: `pnpm install`, `db push`, `db generate` (commit migrations), `codegen` (REQUIRED before typecheck: the exams stub uses generated names and the generated clients still reflect only phase 03), `typecheck`, `seed:check`, tests. 
- Phase 04 (public site): merged on top of phases 01-03 (NOT applied as a patch: it was built on phase 01 with a minimal schema). The phase 02 contract/schema stay authoritative; the 8 public paths use the phase 04 shapes (`Public*` schemas), plus new `/faqs` and `/documents`. Plans are stored one row per duration and grouped by `family_key` for the pricing page. Public seed lives in `lib/db/src/seed/public` (inside `runSeed`; `seed:public` no longer exists). Generated clients were spliced by hand: run `codegen` to replace them, then `typecheck` and the tests. New env: `SUPPORT_EMAIL` (contact form inbox), `VITE_SITE_URL`. Next: phase 05.
