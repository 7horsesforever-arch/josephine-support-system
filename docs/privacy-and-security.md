# Privacy And Security Notes

## Data We Store

- Support task titles, categories, reminder intervals, completion dates, and status.
- Completion/action history.
- Imported school assignment title, course name, due date, points, status, and Canvas link.
- Basic profile data needed for access control: user id, email, display name, and role.
- Caregiver relationship links when caregiver access is enabled.

## Data We Should Avoid Storing

- Diagnoses or detailed medical history.
- School portal passwords or recovery codes.
- Long private email or Canvas message bodies.
- Canvas access tokens beyond the short import request.
- Sensitive caregiver notes unless the app has explicit consent, authentication, and deletion controls.

## Access Model

- Supabase Auth is required before database data is shown.
- Row Level Security is enabled on app tables.
- A student can read and write their own tasks and history.
- A caregiver can read a student's data only through an explicit `caregiver_links` row.
- Prototype public read/write policies were removed from `supabase/schema.sql`.

## Key Handling

- Browser code may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Secret/service-role keys must never be used in browser code, committed to Git, pasted into chat, or placed in public docs.
- SMS provider secrets belong in server-only environment variables and server routes/functions.
- Canvas tokens should be exchanged or used server-side only. Do not commit them, store them in browser storage, or paste them into docs.

## Local Storage

- Local storage is used only when Supabase is not configured.
- When Supabase Auth is active, the app removes the local prototype state and uses private database rows.

## Before Real Data

- Run `supabase/schema.sql`.
- Confirm auth sign-in works.
- Confirm a signed-out browser cannot read or write task rows.
- Add a deletion/export process for Josephine's data.
- Add caregiver invitations rather than manually editing caregiver links long term.
- Prefer Canvas OAuth for production assignment imports. Personal access tokens are acceptable only for a temporary private test.
