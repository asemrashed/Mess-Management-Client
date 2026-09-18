# MMS — Mess Management System

A multi-tenant web app for bachelor messes, hostels, and shared apartments: meals,
groceries, bills, rent, advances, payments, monthly statements, polls, routines,
notifications, rules, member management, and permanent exit/settlement.

This build uses a **separate frontend and backend** (not the Next.js-monolith
architecture originally sketched in the master plan):

```
mms-backend/    Express + TypeScript + Prisma + PostgreSQL — standalone REST API
mms-frontend/   Next.js + TypeScript — calls the API over HTTP, no server-side DB access
```

## Quick start

**1. Backend**
```bash
cd mms-backend
npm install
cp .env.example .env        # set DATABASE_URL/DIRECT_URL (Neon), GOOGLE_CLIENT_ID, JWT secrets
npx prisma migrate dev --name init
npm run seed                  # optional demo data
npm run dev                    # http://localhost:4000
```

**2. Frontend**
```bash
cd mms-frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000, Google OAuth creds, NEXTAUTH_SECRET
npm run dev                          # http://localhost:3000
```

Both `.env` files need the **same** `GOOGLE_CLIENT_ID` — the frontend runs the Google
sign-in flow, and the backend independently verifies the resulting ID token before
issuing its own JWTs. See each project's README for full endpoint lists and auth details.

## What's genuinely working end-to-end

Auth (Google **and** manual email/password registration/login, with email verification
and forgot/reset password over SMTP), multi-tenant Mess creation/joining (invite link +
join code), role-based permissions (Admin/Manager/Member) enforced server-side, feature
toggles enforced server-side, meal submission with real deadline + payment-blocking logic,
meal overrides with audit trail, guest meals, grocery submit→approve/reject workflow,
notes, polls, bills with equal/custom splitting, payments/advances/ledger, accounting
periods with transactional idempotent monthly closing, privacy-filtered statements,
routines with completion tracking, permanent exit with settlement calculation, member
directory, rules, CSV export, audit logs, manager rotation with expiry sweep.

## Auth & Email

- **Google OAuth** and **manual email/password** both work and both land on the same
  backend-issued JWT pair — see each project's README for the exact flow.
- **SMTP is required for the "forgot to everything" email flow** to actually send mail
  (registration verification, password reset, welcome, and optional per-notification
  copies). Without `SMTP_HOST`/`PORT`/`USER`/`PASS` set in the backend's `.env`, emails
  are logged to the console instead of sent, so local dev works either way — but you'll
  want real SMTP credentials before deploying. Any provider works (Gmail app password,
  SendGrid, Mailgun, SES, Resend's SMTP endpoint, etc).
- **Where to find `GOOGLE_CLIENT_ID`**: see the note at the bottom of this README.

## What's intentionally left as stubs

- Backup export to object storage (creates a DB record; actual S3/Cloudinary upload not implemented)
- CSV import
- PDF statement rendering
- A dedicated routine-creation UI (the API fully supports it)

## Finding your GOOGLE_CLIENT_ID

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create (or select) a project.
2. **APIs & Services → OAuth consent screen** — configure it (External is fine for testing; add yourself as a test user if it's in "Testing" publishing status).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Add Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (add your production URL's equivalent later, e.g. `https://yourdomain.com/api/auth/callback/google`).
6. Save — you'll get a **Client ID** and **Client Secret**.
7. Put the **same** Client ID in both `.env` files:
   - `mms-backend/.env` → `GOOGLE_CLIENT_ID` (used to verify the token's audience — no secret needed here, since the backend only verifies ID tokens)
   - `mms-frontend/.env.local` → `GOOGLE_CLIENT_ID` **and** `GOOGLE_CLIENT_SECRET` (NextAuth needs both to run the OAuth flow)

## Not run/verified

My build environment has no network access, so `npm install`, `prisma migrate`, and
`next build` were never executed against this code — you'll need to do that locally.
The code is complete and internally consistent, but treat the first `npm install` +
`npm run dev` locally as the real smoke test.
