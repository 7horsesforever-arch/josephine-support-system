# Josephine Daily Support System

A small Next.js app for daily support tasks, completion-based reminders, and fail-safe escalation tracking.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Current Build

- Daily task dashboard for Josephine.
- Starter tasks for shower, nighttime teeth brushing, and laundry.
- One-tap actions: Done, Already Did It, Snooze, Need Help.
- Completion-based next reminder and fail-safe dates.
- Supabase Auth gate when Supabase is configured.
- Device-first access note with passkey-ready Touch ID setup.
- User-scoped Supabase persistence with Row Level Security.
- Browser-only local mode only when Supabase is not configured.
- Authenticated Canvas import panel for upcoming assignments.
- Server-side escalation endpoint placeholder at `/api/escalations`.
- Server-side Canvas assignment import endpoint at `/api/canvas/import`.
- Server-side Microsoft Graph mail import endpoint at `/api/microsoft/mail/import`.
- Server-side Gmail import endpoint at `/api/google/gmail/import`.
- Server-side school email triage endpoint at `/api/email/triage`.
- Review-only communications drafting endpoint at `/api/email/drafts`.

## Supabase Setup

The schema is in `supabase/schema.sql`.

To enable Supabase mode:

1. Open the Supabase SQL editor.
2. Run the contents of `supabase/schema.sql`.
3. Confirm these environment variables exist locally and in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CREDIT_UNION_URL=
CANVAS_TOKEN_ENCRYPTION_KEY=
PLAID_TOKEN_ENCRYPTION_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_PRODUCTS=transactions
```

The schema uses authenticated-user policies. Do not enter real sensitive data until you have confirmed sign-in and RLS behavior in Supabase.

`CANVAS_TOKEN_ENCRYPTION_KEY` is server-only and is required before saving a Canvas token. Generate a strong value with `openssl rand -base64 32`, put it in `.env.local` and deployment environment variables, and do not commit it.

`PLAID_TOKEN_ENCRYPTION_KEY` is server-only and is required before saving Plaid access tokens. Use Plaid Link for the credit union connection; do not collect or store banking usernames or passwords.

Passkey support is wired as a ready path for Josephine's MacBook with Touch ID. Keep the secure email link enabled as the backup sign-in path, then enable Supabase passkey/WebAuthn support before registering a passkey from the signed-in dashboard.

## Privacy And Security

Read `docs/privacy-and-security.md` before adding real school, health, phone, email, or caregiver data.

Read `docs/josephine-context-summary.md` before making product decisions that affect prioritization, reminders, email/assignment summaries, or access flows.

Read `docs/device-first-access.md` before changing sign-in, passkey, Microsoft, Canvas, or school portal access.

Read `docs/accessibility-support-design.md` before changing task, email, or assignment workflows.

## Useful Commands

```bash
npm run lint
npm run build
```

## Next Steps

- Run the Supabase schema.
- Verify auth sign-in and private mode.
- Enable Supabase passkeys and register the MacBook Touch ID passkey.
- Add caregiver SMS fail-safe alerts.
- Connect the Canvas import endpoint to an authenticated UI flow.
- Connect Microsoft OAuth so CSU email can be imported without handling passwords.
- Connect Google OAuth so `7horsesforever@gmail.com` can be imported without handling passwords.
- Add an authenticated UI for email triage results.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
