# 09b — Admin panel (content, users and business)

```text
PHASE 09b — ADMIN PANEL, CONTENT, USERS AND BUSINESS
Context: read docs/PLATFORM_PLAN.md (sections 5.7, 6, 9) and follow the master rules.
Prerequisite: Phase 09a passed. Reuse the admin foundation built in 09a.

GOAL
Complete the admin panel so the owner can run content, users, sales and support
without a developer.

MODULES
1. OSCE station editor: structured form for every station section (see plan 5.4),
   marking-domain builder, live preview in Learning/Exam and Candidate/Examiner modes,
   draft/review/publish workflow, duplicate station, bulk import/export JSON.
2. Course builder: drag-and-drop modules and lessons, direct video upload with processing
   status, captions upload, attachments, free-preview toggle, preview as learner, publish.
3. CMS: pages, blog (rich text, cover image, SEO fields, scheduled publish), testimonials
   (with consent flag), FAQs, legal pages, announcement banners.
4. Users: search/filter, profile and activity timeline, change role, grant/revoke access
   (with reason and expiry), suspend/unsuspend, force sign-out, AUDITED impersonation
   (visible banner, time-limited, read-only by default), GDPR export and deletion.
5. Billing: plans and prices, coupons, subscriptions list, invoices, issue refund, manual
   entitlement grant, institution licences and seats.
6. Support: contact messages inbox (status, assignee, internal notes, reply by email),
   question error reports shortcut.
7. Marketing: email templates (React Email preview), campaigns to segments (e.g. target
   exam, inactive 14 days), onboarding sequence editor, referral codes, unsubscribe handling.
8. Media library: upload, folders/tags, search, usage tracking (where used), safe delete.
9. System: audit log viewer with filters and export, feature flags, site settings, role and
   permission matrix (read-only view), health status (DB, jobs queue, Stripe/Mux webhooks
   last received), backup information.

TESTS
Playwright: admin builds a course with a video lesson and publishes it; creates and
publishes an OSCE station; grants access to a user; issues a refund in test mode;
impersonates a user and the action is audited.

ACCEPTANCE CHECKS
- Each module supports create, read, update, archive/delete (where allowed) with validation.
- Impersonation is clearly indicated, time-limited and logged.
- Refund and manual grant update entitlements immediately.
- Audit log shows all writes; permission tests cover every new endpoint.
- axe passes on key admin screens; typecheck and tests pass.

REPORT using the format in the master prompt, then stop.
```
