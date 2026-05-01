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
- Browser persistence with `localStorage`.
- Supabase-ready sync layer that falls back to local mode if the database is not configured.

## Supabase Setup

The schema is in `supabase/schema.sql`.

To enable Supabase mode:

1. Open the Supabase SQL editor.
2. Run the contents of `supabase/schema.sql`.
3. Confirm these environment variables exist locally and in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The current schema includes prototype read/write policies for the public app. Replace those with authenticated-user policies before storing sensitive real data.

## Useful Commands

```bash
npm run lint
npm run build
```

## Next Steps

- Run the Supabase schema.
- Verify the app switches from local mode to Supabase mode.
- Add authentication before entering sensitive live data.
- Add caregiver SMS fail-safe alerts.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
