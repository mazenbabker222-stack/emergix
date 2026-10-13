# 03 — Authentication and roles

```text
PHASE 03 — AUTHENTICATION AND ROLES
Context: read docs/PLATFORM_PLAN.md (sections 4, 5.2, 5.6, 9) and follow the master rules.
Prerequisite: Phase 02 passed.

GOAL
Replace the placeholder Login/Signup with real, secure accounts and enforce roles
on both API and UI.

TASKS
1. Integrate Better Auth (Drizzle adapter) in artifacts/api-server:
   email/password, email verification, password reset (Resend, React Email
   templates), Google login, optional TOTP 2FA. httpOnly + Secure + SameSite
   cookie sessions; no tokens in localStorage.
2. Hardening: helmet, CORS allow-list from APP_URL, CSRF protection for cookie
   auth, express-rate-limit on auth routes, account lockout after repeated
   failures, generic error messages (no user enumeration).
3. Sessions and devices: record devices, limit concurrent sessions (configurable,
   default 2), device list with "sign out other devices", new-device alert email.
4. RBAC: roles learner, instructor, editor, admin, superadmin. Middlewares
   requireAuth, requireRole(...roles), requireEntitlement(examId) (stub until
   Phase 08). Central permission matrix in one file.
5. Frontend: AuthProvider + hooks, route guards and three layouts
   (PublicLayout, AppLayout, AdminLayout). Real forms for /login, /signup,
   /forgot-password, /reset-password, /verify-email using react-hook-form + zod,
   with accessible error messages and loading states.
6. Account page (/app/account): profile (name, country, specialty, target exam and
   date), change email/password, 2FA setup, active sessions, data export (JSON
   download), delete account (confirmation + cooldown).
7. Audit: log sign-ins, password changes, role changes.
8. Tests: unit tests for permission matrix; integration tests for each auth flow;
   Playwright e2e for signup -> verify -> login -> logout and for guarded routes
   redirecting correctly.

ACCEPTANCE CHECKS
- A new user can sign up, verify email, log in, enable 2FA, log out; reset password works.
- A learner receives 403 on any /api/admin/* route and is redirected from /admin.
- Rate limiting and lockout verified by tests.
- No secrets or tokens appear in localStorage or logs.
- typecheck, unit, integration and e2e tests pass.

REPORT using the format in the master prompt, then stop.
```
