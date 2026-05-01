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
- Starter tasks for Scrub It!, Brush It!, and Wash It! routines.
- Weekly Oura Ring charge reminder, with a Health & Wellness data dashboard ready for Oura and Apple Health summaries.
- Reward stars for Scrub It!, Brush It!, and Wash It!, with caregiver-admin cashout controls that record manual credit-union payouts.
- Weekly room reset reminder with an after-cleaning supply check for Amazon list review.
- One-tap actions: Done, Already Did It, Snooze, Need Help.
- Completion-based next reminder and fail-safe dates.
- Dedicated Did it page at `/support/did-it` instead of a front-page done-log module.
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
- Social Decoder support for selected emails or pasted texts.
- Vehicle support reminders for mileage checks, fuel, wash/cleanout, and oil-service planning.
- Work support reminders for job search, hours tracking, paychecks, and Drive-based document storage.
- Viper Cam placeholder for a private barn camera link or future secure stream.
- Real-time transit links for Transfort Bus Tracker, CSU campus routes, RideTransfort alerts, and text-stop arrivals.
- College-life support panels for medical, emergency plan, campus logistics, semester launch, calendar routines, documents, packing, travel, social belonging, and help scripts.
- Dedicated `/support/...` pages for larger modules so the main dashboard can stay lighter while each area gets room to grow.
- Deadline-only front-page module area; non-deadline support content lives on dedicated pages.
- Caregiver/admin page at `/support/admin`, linked quietly from the bottom of the dashboard and protected for `chilton18@gmail.com` through Supabase Google login.
- In-app safety alert response for self-harm or suicide-related concerns typed into Ask JoJo, with 988, CSU Tell Someone, and HelpCompass resources. This does not monitor browser history, Mac activity, texts, email, or daily behavior.
- App-wide browser voice entry for writable fields, plus a server transcription endpoint at `/api/speech/transcribe` for future uploaded-audio workflows.
- Persistent Google Drive and OneDrive OAuth connection panel on `/support/docs`, with encrypted server-side token storage for Docs & Packing workflows.

## Supabase Setup

The schema is in `supabase/schema.sql`.

To enable Supabase mode:

1. Open the Supabase SQL editor.
2. Run the contents of `supabase/schema.sql`.
3. Confirm these environment variables exist locally and in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CREDIT_UNION_URL=
NEXT_PUBLIC_VIPER_CAM_URL=
CANVAS_TOKEN_ENCRYPTION_KEY=
PLAID_TOKEN_ENCRYPTION_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_PRODUCTS=transactions
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
MICROSOFT_ONEDRIVE_CLIENT_ID=
MICROSOFT_ONEDRIVE_CLIENT_SECRET=
CLOUD_STORAGE_OAUTH_STATE_SECRET=
CLOUD_STORAGE_GOOGLE_TOKEN_ENCRYPTION_KEY=
CLOUD_STORAGE_ONEDRIVE_TOKEN_ENCRYPTION_KEY=
OPENAI_API_KEY=
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

The schema uses authenticated-user policies. Do not enter real sensitive data until you have confirmed sign-in and RLS behavior in Supabase.

`CANVAS_TOKEN_ENCRYPTION_KEY` is server-only and is required before saving a Canvas token. Generate a strong value with `openssl rand -base64 32`, put it in `.env.local` and deployment environment variables, and do not commit it.

`PLAID_TOKEN_ENCRYPTION_KEY` is server-only and is required before saving Plaid access tokens. Use Plaid Link for the credit union connection; do not collect or store banking usernames or passwords.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and is required for OAuth callbacks that need to save encrypted Google Drive and OneDrive tokens after the provider redirects back to the app. Never expose it to the browser.

`CLOUD_STORAGE_OAUTH_STATE_SECRET`, `CLOUD_STORAGE_GOOGLE_TOKEN_ENCRYPTION_KEY`, and `CLOUD_STORAGE_ONEDRIVE_TOKEN_ENCRYPTION_KEY` are server-only. Generate each with `openssl rand -base64 32`. Configure Google OAuth to redirect to `/api/storage/oauth/callback/google_drive` and Microsoft OAuth to redirect to `/api/storage/oauth/callback/onedrive`.

`OPENAI_API_KEY` is server-only and is used by `/api/safety/moderate` for Ask JoJo safety checks. The reviewable safety threshold, model, categories, and local trigger patterns live in `src/lib/safety/reviewable-config.ts`.

`OPENAI_TRANSCRIPTION_MODEL` controls `/api/speech/transcribe`. The default is `gpt-4o-mini-transcribe`.

Passkey support is wired as a ready path for Josephine's MacBook with Touch ID. Keep the secure email link enabled as the backup sign-in path, then enable Supabase passkey/WebAuthn support before registering a passkey from the signed-in dashboard.

Caregiver/admin access uses Supabase Google OAuth. Enable the Google provider in Supabase Auth, add `/support/admin` to the allowed redirect URLs, and keep access limited to `chilton18@gmail.com`.

## Privacy And Security

Read `docs/privacy-and-security.md` before adding real school, health, phone, email, or caregiver data.

Read `docs/josephine-context-summary.md` before making product decisions that affect prioritization, reminders, email/assignment summaries, or access flows.

Read `docs/device-first-access.md` before changing sign-in, passkey, Microsoft, Canvas, or school portal access.

Read `docs/accessibility-support-design.md` before changing task, email, or assignment workflows.

Read `docs/speech-to-text.md` before changing voice entry, audio upload, or transcription workflows.

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
- Connect Google OAuth so Josephine's personal Gmail can be imported without handling passwords.
- Add an authenticated UI for email triage results.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
