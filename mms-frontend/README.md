# MMS Frontend (Next.js + TypeScript, external API)

Talks exclusively to the separate `mms-backend` Express API over REST — no server
actions, no Prisma, no direct DB access from this app.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET
npm run dev                          # http://localhost:3000
```

You'll need a Google OAuth Client ID (Web application type) with:
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- The **same** `GOOGLE_CLIENT_ID` must also be set as `GOOGLE_CLIENT_ID` in the backend's
  `.env`, since the backend independently verifies the ID token's audience.

## Auth flow

Two paths, both landing on the same backend JWT pair, stored in `session.apiAccessToken`:

1. **Google** — user clicks "Continue with Google" on `/login` → NextAuth runs the OAuth
   flow → in the `jwt` callback (`src/lib/authOptions.ts`) we take the Google `id_token`
   and POST it to the backend's `POST /auth/google`, which verifies it and returns JWTs.
2. **Email/password** — the same `/login` page has a form wired to NextAuth's
   `CredentialsProvider`. Its `authorize()` calls the backend's `POST /auth/login`
   directly and returns the resulting user + JWTs, which the `jwt` callback copies onto
   the session the same way as the Google path. `/register` calls `POST /auth/register`
   then immediately signs in via the same credentials provider. `/forgot-password` and
   `/reset-password/[token]` call the backend's forgot/reset endpoints directly (no
   NextAuth session needed for those). `/verify-email/[token]` confirms the emailed link.

Either path ends the same way: `Authorization: Bearer <apiAccessToken>` attached to every
API call via `src/lib/api.ts`. The backend never trusts NextAuth session cookies, only its
own JWTs — issued only after independently verifying Google or a password.

## Structure

```
src/
├── app/
│   ├── page.tsx                    landing page
│   ├── login/                      Google + email/password sign-in
│   ├── register/                   manual account creation
│   ├── forgot-password/            request a reset link
│   ├── reset-password/[token]/     consume the reset link
│   ├── verify-email/[token]/       confirm a registration email
│   ├── create-mess/, join/         Mess creation & joining
│   ├── api/auth/[...nextauth]/     NextAuth route handler
│   └── mess/[messUsername]/
│       ├── layout.tsx               nav shell, loads Mess + role via MessContext
│       ├── dashboard/
│       ├── meals/                   fully wired: quantity steppers, 8s poll, deadline errors
│       ├── groceries/               submit + manager approve/reject
│       ├── notes/, polls/           fully wired
│       ├── bills/, payments/, advances/   fully wired
│       ├── routines/, exit/         fully wired core flows
│       ├── members/, rules/         fully wired
│       ├── reports/, settings/      admin-only, fully wired
├── lib/api.ts                       fetch client, attaches JWT
├── lib/authOptions.ts               NextAuth config + backend token exchange
├── context/MessContext.tsx          current Mess + role + settings
└── components/AuthGate.tsx          redirects signed-out users to /login
```

## Live data strategy

Per the master plan: no WebSockets. The meal board polls every 8s, groceries/notes/polls
poll every 20s, and every list has a manual refresh path via TanStack Query's refetch.
Financial mutations (payments, advances, closing) are never treated as optimistic — the UI
always waits for the server response and re-fetches.

## What's stubbed

- **Routine creation form** — the API (`POST /mess/:messUsername/routines`) supports full
  rotation schedules; the UI only lists/completes assignments. Add a creation form matching
  your household's rotation pattern.
- **Invitation-link landing** — `/join/invite/[token]` joins the Mess but redirects to
  `/create-mess` afterward since the API doesn't return the Mess username on that route;
  wire that up however you encode/share invite links.
- No PDF statement rendering (CSV export only, from the backend).
