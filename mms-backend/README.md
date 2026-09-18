# MMS Backend (Express + TypeScript + Prisma + PostgreSQL)

Standalone REST API for the Mess Management System. Deployable independently of the
frontend (e.g. Render, Railway, Fly.io, a VPS, or Vercel serverless functions).

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, GOOGLE_CLIENT_ID, JWT secrets
npx prisma migrate dev --name init
npm run seed            # optional demo data: user admin@example.com / member@example.com, mess "demo-mess"
npm run dev              # http://localhost:4000
```

## Auth model

Two sign-in paths, converging on the same JWT issuance:

**Google** — the frontend performs Google Sign-In itself and obtains a Google ID token.
It POSTs that token to `POST /auth/google`. This API verifies it against Google, upserts
the `User` (marked `emailVerified` immediately, since Google already confirmed it), and
returns its own short-lived access JWT + long-lived refresh JWT.

**Manual email/password** — `POST /auth/register` creates a `User` with a bcrypt
`passwordHash`, sends a verification email, and returns JWTs immediately (the account
isn't blocked from use while unverified). `POST /auth/login` checks the password and
returns JWTs. `POST /auth/verify-email` consumes the emailed token. Forgot/reset password
is `POST /auth/forgot-password` → emails a time-limited reset link → `POST
/auth/reset-password` consumes it. `POST /auth/change-password` is for signed-in users who
know their current password. All of `/auth/login`, `/auth/register`,
`/auth/forgot-password`, and `/auth/resend-verification` are rate-limited.

Either way, every other route requires `Authorization: Bearer <accessToken>`. Use
`POST /auth/refresh` to mint a new access token from a refresh token.

## Email (SMTP)

All outgoing email goes through `src/lib/mailer.ts` (nodemailer), configured via
`SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` in `.env`. Works
with any SMTP provider — Gmail app password, SendGrid, Mailgun, Amazon SES, Resend's SMTP
endpoint, etc. If SMTP isn't configured, emails are logged to the console instead of
failing, so local dev works without setting it up. Email failure never rolls back the
triggering business transaction (registration, password reset, etc. all still succeed).

Emails currently sent: registration verification, password reset, Google-signup welcome,
and — when a Mess has `emailNotificationsEnabled` on — a copy of every in-app notification
(grocery decisions, manager assignment, exit decisions, etc.) via the shared `notify()`
helper in `src/services/notification.service.ts`.

## Request pipeline

Every mutating route runs, in order: `requireAuth` (valid JWT) → `requireMessMembership`
(active membership in the `:messUsername` from the URL — this is what makes cross-Mess
access impossible, since every query afterwards is scoped to `req.mess.id`) →
`requireRole(...)` and/or `requireFeature(...)` → Zod validation → business rule checks
in the service layer → a Prisma transaction where multiple records change → an
`AuditLog` entry for sensitive actions.

## Key endpoints

```
POST   /auth/google
POST   /auth/register
POST   /auth/login
POST   /auth/verify-email
POST   /auth/resend-verification
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/change-password
POST   /auth/refresh
GET    /auth/me

POST   /mess
POST   /mess/join/code
POST   /mess/join/invite/:token
GET    /mess/:messUsername
PATCH  /mess/:messUsername/settings
GET    /mess/:messUsername/members
PATCH  /mess/:messUsername/members/:userId/role
POST   /mess/:messUsername/invitations
POST   /mess/:messUsername/join-code/regenerate

GET    /mess/:messUsername/meals?date=YYYY-MM-DD
GET    /mess/:messUsername/meals/mine
POST   /mess/:messUsername/meals
PATCH  /mess/:messUsername/meals/:id/override
POST   /mess/:messUsername/meals/guest

GET    /mess/:messUsername/groceries
POST   /mess/:messUsername/groceries
PATCH  /mess/:messUsername/groceries/:id/decision

GET|POST /mess/:messUsername/notes
PATCH  /mess/:messUsername/notes/:id/complete

GET|POST /mess/:messUsername/polls
POST   /mess/:messUsername/polls/:id/vote

GET|POST /mess/:messUsername/bills
GET|POST /mess/:messUsername/payments
GET    /mess/:messUsername/payments/balance
GET|POST /mess/:messUsername/advances

GET|POST /mess/:messUsername/periods
POST   /mess/:messUsername/periods/:id/close
GET    /mess/:messUsername/statements

GET|POST /mess/:messUsername/routines
PATCH  /mess/:messUsername/routines/assignments/:id/complete

GET|POST /mess/:messUsername/exit
GET    /mess/:messUsername/exit/:id/preview
PATCH  /mess/:messUsername/exit/:id/decision

GET    /mess/:messUsername/notifications
GET|POST /mess/:messUsername/rules
GET    /mess/:messUsername/reports/meals
GET    /mess/:messUsername/reports/finance
GET    /mess/:messUsername/reports/groceries.csv
GET    /mess/:messUsername/audit-logs
GET|POST /mess/:messUsername/backups
GET|POST /mess/:messUsername/managers
POST   /mess/:messUsername/managers/check-expiry

POST   /cron/manager-expiry   (requires header x-cron-secret: CRON_SECRET)
```

## What's fully wired vs. stubbed

**Fully working:** auth, multi-tenant mess/membership, invitations/join codes, feature
toggles, role-based permissions, meal submission with server-side deadline + payment-block
enforcement, meal overrides with audit trail, guest meals, meal-pool/meal-rate accounting,
grocery submission + approval workflow, notes, polls with duplicate-vote protection, bills
with equal/custom splitting, payments/advances/ledger, accounting periods, transactional
idempotent monthly closing, monthly statements with financial-privacy filtering, routines
with rotation and completion, permanent exit with settlement calculation, notifications,
rules, CSV export, audit logs, manager rotation with expiry sweep.

**Stubbed (functional CRUD, but light on business rules):** backups (creates a `Backup`
record; wire the actual object-storage export yourself), email notifications (no Resend
call is made — swap in `RESEND_API_KEY` and a mailer where `notify()` is called if you want
emails), CSV import, PDF statements.

## Deployment notes

- Use Neon PostgreSQL for `DATABASE_URL`/`DIRECT_URL`.
- Set `CRON_SECRET` and call `POST /cron/manager-expiry` from Vercel Cron, GitHub Actions,
  or any scheduler — the app does not depend on it running for correctness.
- Never expose `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`'s matching
  client secret (not needed here since we only verify ID tokens), or `CRON_SECRET` to the
  frontend.
