# 01 — Rebrand, cleanup and foundation

```text
PHASE 01 — REBRAND, CLEANUP AND FOUNDATION
Context: read docs/PLATFORM_PLAN.md (sections 2, 4 and 10) and follow the master rules.

GOAL
Rename the product to "Exam Platform", clean the repository and prepare a solid
foundation, with ZERO change in features or layout other than the name.

TASKS
1. Brand config
   - Create artifacts/oscepass/src/config/brand.ts exporting: name ("Exam Platform"),
     shortName ("Exam"), tagline, supportEmail, domain, social links, legal
     disclaimer text ("Not affiliated with or endorsed by the Royal College of
     Emergency Medicine.").
   - Replace EVERY user-facing "OSCEPASS" (UI text, <title> suffix in usePageMeta,
     og tags, index.html, footer, logo alt text, replit.md, robots/sitemap, static
     neurology HTML pages) with values from the brand config. First run
     `grep -ri oscepass` across the repo and list every hit before editing.
   - KEEP internal names unchanged for now: folder artifacts/oscepass, package
     @workspace/oscepass, .replit-artifact. Renaming them risks breaking Replit
     workflows and the lockfile; propose it as an optional separate step.
   - The current logo (public/brand/logo.jpg, favicon.svg) carries the old brand.
     Replace with a simple text-based SVG wordmark "Exam Platform" and a new
     favicon; list the old files so the owner can remove them.
2. Split artifacts/oscepass/src/App.tsx (single large file) into:
   app/ (router, providers), pages/ (one file per page), features/, and
   components/shared/ (Header, Footer, SiteLayout, Reveal, Brand, PageHero, VideoModal).
   No visual or behavioural change; keep wouter routes and the BASE_URL handling.
3. Duplicates: use `diff` to verify, then remove duplicate files in
   public/neurology (curriculum.html, MRCEM_Neurology__*.html, *-station_<digits>.html
   copies of the stations) and keep ONE of public/assets or public/brand (update
   all references). Report exactly what was deleted.
4. Environment: create .env.example (DATABASE_URL, PORT, BASE_PATH, SESSION_SECRET,
   APP_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MUX_TOKEN_ID, MUX_TOKEN_SECRET,
   RESEND_API_KEY, SENTRY_DSN, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY).
   Document that vite.config.ts requires PORT and BASE_PATH.
5. Documentation: fill replit.md (project name, product summary, repo map, stack,
   commands, env vars, gotchas). Copy the spec to docs/PLATFORM_PLAN.md.
6. Tooling: ESLint + Prettier configs, Vitest and Playwright scaffolding with one
   smoke test each, and a GitHub Actions workflow (install, typecheck, lint, test).
7. Add /api/readyz (checks DB connectivity) next to /api/healthz via OpenAPI + codegen.

ACCEPTANCE CHECKS
- `pnpm install` and `pnpm run typecheck` pass.
- `grep -ri oscepass` shows only the intentionally kept internal names.
- Every page renders exactly as before (screenshot or manual route walk of /, /courses,
  /practice, /resources, /about, /contact, /login, /signup, /neurology, one station).
- Smoke tests pass; CI workflow file is valid.
- No broken image or link references after duplicate removal.

REPORT using the format in the master prompt, then stop.
```
