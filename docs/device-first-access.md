# Device-First Access Note

Josephine's support system should treat her MacBook with Touch ID as the primary access path. The goal is to reduce repeated password entry while keeping account access private and recoverable.

## Current Access Flow

- Supabase Auth protects private app data before it is shown.
- The secure email link remains the backup sign-in method.
- The sign-in screen defaults to `chilton18@gmail.com`.
- The app is passkey-ready and initializes Supabase with `auth.experimental.passkey: true`.
- When Supabase passkeys are enabled for the project and client SDK, Josephine can register a device passkey after one authenticated session.

## Touch ID And Passkeys

- A passkey should be registered from Josephine's MacBook while Touch ID is enabled.
- The passkey belongs to the device/keychain, not to the app database.
- The app should continue to offer a secure email fallback for account recovery or device replacement.
- Do not require repeated school, Microsoft, Google, Canvas, or RamWeb passwords inside the app.

## School Account Boundary

- School assignments and email should use OAuth or approved access tokens, not stored passwords.
- The app must not collect, save, replay, or display CSU passwords.
- Microsoft, Google, and Canvas connections should be revocable and scoped to the smallest permissions needed.
- Any imported school data should remain user-scoped under Row Level Security.
- Josephine's personal Gmail address, `7horsesforever@gmail.com`, should use Google OAuth and email-read scopes only.
- Canvas QR mobile login codes are for the Canvas mobile app. Treat them like passwords, and do not use them as app API tokens.
- Saved Canvas API tokens must be encrypted server-side, expire explicitly, and remain revocable from both this app and Canvas.

## Setup Checklist

1. Enable Supabase Auth and run `supabase/schema.sql`.
2. Confirm sign-in works with the secure email link.
3. Enable Supabase passkey/WebAuthn support for the project.
4. Open the app on Josephine's MacBook and register the Touch ID passkey from the signed-in dashboard.
5. Keep email-link sign-in enabled as a recovery path.
