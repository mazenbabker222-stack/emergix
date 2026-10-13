# Exam Platform — Phased Build Prompts

Each prompt below is **self-contained**: paste it into your AI builder (Claude Code / Replit Agent) when you reach that phase. Always paste **00 – Master** first and only once.

| # | Phase | Main outcome |
|---|---|---|
| 00 | Master context | Rules and scope, paste once |
| 01 | Rebrand, cleanup, foundation | Name "Exam Platform", clean repo, CI, env docs |
| 02 | Database, API contract, seed | Full schema, OpenAPI, codegen, seed data |
| 03 | Authentication and roles | Real accounts, RBAC, account page |
| 04 | Public site and exam pages | Data-driven exam pages, FAQ, calendar, pricing, SEO |
| 05 | Question bank | Tutor/Timed/Custom modes, analytics v1 |
| 06 | OSCE stations and simulator | Migrated stations, timers, marking, circuit mode |
| 07 | Courses and video | Lessons, Mux video, progress, certificates |
| 08 | Billing and entitlements | Stripe plans, coupons, access control |
| 09a | Admin panel — core | Dashboard, exams, questions, taxonomy |
| 09b | Admin panel — content, users, business | Stations, courses, CMS, users, billing, support, system |
| 10 | Engagement features | Flashcards, planner, benchmarking, emails, optional AI |
| 11 | Hardening and launch | Accessibility, security, load, PWA, runbook |

**Rule:** do not start a phase until the previous phase's acceptance checks pass.
**Spec:** the full specification is `docs/PLATFORM_PLAN.md`; every prompt tells the builder to read it.
