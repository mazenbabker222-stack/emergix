# 04 — Public site and exam pages

```text
PHASE 04 — PUBLIC SITE AND EXAM PAGES
Context: read docs/PLATFORM_PLAN.md (sections 3, 5.1, 8, 9) and follow the master rules.
Prerequisite: Phase 03 passed.

GOAL
Turn the marketing pages into a data-driven, SEO-ready public website modelled on
the structure of an official exam-information page, with original branding and content.

TASKS
1. API: implement public endpoints for exams, FAQs, dates/fees, documents, banners,
   pages, blog posts, plans (read-only), contact form submission (rate limited, stored,
   emailed to supportEmail).
2. Header mega-menu (Exams, Courses, Question Bank, OSCE Stations, Pricing, Resources,
   About, Help; Sign in / Start free), keyboard accessible, mobile drawer, sticky.
3. Exam pages /exams and /exams/:slug, fully data-driven: exam type, format, number of
   questions, sections, duration, location, content; comparison table in the order
   Primary -> SBA -> OSCE; FAQ Accordion (who can sit it, how to book, when, cost,
   where, structure, marking and standard setting, results timing); downloadable
   documents; dismissible announcement banner (remember dismissal safely in
   try/catch localStorage); link to the official source; non-affiliation disclaimer.
4. /calendar: table of exam dates and fees from the DB, filter by exam, "Add to
   calendar" .ics export. Show the last-updated date and a note to confirm on the
   official site.
5. /pricing (plans per exam, comparison, FAQ), /free-demo (limited sample questions
   and one lesson, no login), /blog and /blog/:slug, /help (searchable FAQ), /contact,
   /legal/:page (Terms, Privacy, Cookies, Refunds, Medical disclaimer) with placeholder
   legal text clearly marked "REVIEW BY LEGAL COUNSEL".
6. SEO and performance: pre-render public routes at build time, unique title and
   description per page (extend usePageMeta), canonical URLs, Open Graph/Twitter cards,
   JSON-LD (Organization, FAQPage, Course), sitemap.xml generated from DB, robots.txt,
   cookie-consent banner that gates analytics.
7. Footer: brand, socials, address, phone, email, quick links, copyright, disclaimer.
8. Content: seed Primary/SBA/OSCE details with the structural facts from the plan
   (180 SBA / 3h; 180 SBA in 2 x 2h with 1h break; 16 stations x 8 min + 2 rest) and
   mark all fees/dates PLACEHOLDER.

ACCEPTANCE CHECKS
- Changing an exam's FAQ or date in the DB changes the page after reload (no code change).
- Lighthouse >= 90 (Performance, Accessibility, Best Practices, SEO) on /, /exams/:slug, /pricing.
- axe reports no serious or critical violations; accordion works with keyboard and screen reader.
- Rich results test passes for FAQPage JSON-LD; sitemap lists all public URLs.
- typecheck and e2e tests pass.

REPORT using the format in the master prompt, then stop.
```
