# 08 — Billing and entitlements

```text
PHASE 08 — BILLING AND ENTITLEMENTS
Context: read docs/PLATFORM_PLAN.md (sections 5.6, 6, 9) and follow the master rules.
Prerequisite: Phase 07 passed. Use Stripe TEST mode only.

GOAL
Sell subscriptions safely and control access to content by entitlement.

TASKS
1. Products and prices: plans per exam (1/3/6/12 months), bundles, free tier, optional
   trial, regional prices (multi-currency). Admin-managed (UI in Phase 09b); seed placeholders.
2. Checkout: Stripe Checkout sessions, success/cancel pages, Customer Portal link,
   coupons/promotion codes, VAT/tax settings via Stripe Tax if enabled.
3. Webhooks: raw-body route with signature verification; idempotent handlers storing
   event ids in webhook_events; handle checkout.session.completed, invoice.paid,
   invoice.payment_failed, customer.subscription.updated/deleted, charge.refunded.
4. Entitlements: derive from subscriptions/licences into the entitlements table; middleware
   requireEntitlement(examId) used by question bank, courses and stations; grace period on
   failed payment; clear UI states (locked content with upgrade prompt).
5. Billing pages (/app/billing): current plan, renewal date, invoices, change/cancel via portal.
6. Institution licences: seat management (invite by email, revoke), usage counts.
7. Refunds and manual grants (API only; admin UI in Phase 09b), all audit logged.
8. Emails: receipt, payment failed, trial ending, subscription cancelled.
9. Tests: unit tests for entitlement derivation; integration tests with Stripe test fixtures
   and replayed webhooks; Playwright purchase flow in test mode.

ACCEPTANCE CHECKS
- Test purchase unlocks content within seconds; cancel/expiry locks it after the period.
- Replaying the same webhook event twice changes nothing.
- A failed payment triggers the grace period and an email.
- No card data touches our servers; secrets only in env; typecheck and tests pass.

REPORT using the format in the master prompt, then stop.
```
