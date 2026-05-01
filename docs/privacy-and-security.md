# Privacy And Security Notes

## Data We Store

- Support task titles, categories, reminder intervals, completion dates, and status.
- Completion/action history.
- Imported school assignment title, course name, due date, points, status, and Canvas link.
- Imported school and personal email metadata/previews from Microsoft Graph and Gmail: sender, subject, body preview/snippet, received time, importance/read state, source, and web link.
- Email triage output: priority, category, short summary, suggested action, and possible due-date hint.
- Email draft output: recipient, subject, body, status, source, and drafting agent name.
- A public credit union login URL for opening the banking site in a separate tab.
- Basic profile data needed for access control: user id, email, display name, and role.
- Caregiver relationship links when caregiver access is enabled.

## Data We Should Avoid Storing

- Diagnoses or detailed medical history.
- Disability labels, neurotype labels, or clinical support details unless there is a specific, consented accommodation workflow that requires storing them. Private design notes may reference Josephine's needs, but app database rows should avoid them by default.
- School portal passwords or recovery codes.
- Banking usernames, passwords, account numbers, routing numbers, card numbers, balances, or bill-pay credentials.
- Long private email or Canvas message bodies.
- Canvas access tokens beyond the short import request.
- Microsoft passwords or Microsoft Graph access tokens beyond the short import request.
- Google passwords or Gmail OAuth access tokens beyond the short import request.
- Sensitive caregiver notes unless the app has explicit consent, authentication, and deletion controls.

## Access Model

- Supabase Auth is required before database data is shown.
- Device-first access is preferred on Josephine's MacBook with Touch ID.
- Passkeys should be used when Supabase passkey/WebAuthn support is enabled, with secure email link sign-in kept as recovery.
- Row Level Security is enabled on app tables.
- A student can read and write their own tasks and history.
- A caregiver can read a student's data only through an explicit `caregiver_links` row.
- Prototype public read/write policies were removed from `supabase/schema.sql`.

## Key Handling

- Browser code may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Secret/service-role keys must never be used in browser code, committed to Git, pasted into chat, or placed in public docs.
- SMS provider secrets belong in server-only environment variables and server routes/functions.
- Canvas tokens should be exchanged or used server-side only. Do not commit them, store them in browser storage, or paste them into docs.
- Saved Canvas API tokens must be encrypted server-side with `CANVAS_TOKEN_ENCRYPTION_KEY`, have an explicit expiration date, and be revocable from the app and Canvas.
- Microsoft mail access should use delegated OAuth scopes such as `Mail.Read`; never collect, store, or replay the user's school password.
- Gmail access should use delegated Google OAuth scopes such as `gmail.readonly`; never collect, store, or replay the user's Google password.
- Email drafting agents may prepare editable replies, but they must not send, delete, archive, or mark mail read without explicit review.
- Financial support should link out to the credit union. The app must not collect banking credentials, initiate payments, or move money.
- Passkeys are device/keychain credentials. Do not store passkey secrets, raw WebAuthn credential material, or biometric data in app tables.

## Local Storage

- Local storage is used only when Supabase is not configured.
- When Supabase Auth is active, the app removes the local prototype state and uses private database rows.

## Before Real Data

- Run `supabase/schema.sql`.
- Confirm auth sign-in works.
- Register a Touch ID passkey from Josephine's MacBook only after passkeys are enabled in Supabase.
- Confirm a signed-out browser cannot read or write task rows.
- Add a deletion/export process for Josephine's data.
- Add caregiver invitations rather than manually editing caregiver links long term.
- Prefer Canvas OAuth for production assignment imports. Personal access tokens are acceptable only for a temporary private test.
- If using a saved Canvas token during the private build, set `CANVAS_TOKEN_ENCRYPTION_KEY`, choose a semester or school-year expiration, and revoke/replace the token if it is pasted into chat or exposed elsewhere.
- Prefer Microsoft OAuth authorization-code flow for school email imports. A password-based email connection is not acceptable for production.
- Prefer Google OAuth authorization-code flow for personal Gmail imports. A password-based Gmail connection is not acceptable for production.
- Keep accommodation support in UI behavior and triage rules wherever possible, rather than storing diagnosis labels.
