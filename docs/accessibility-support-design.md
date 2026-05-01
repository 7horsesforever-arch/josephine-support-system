# Accessibility Support Design

This app is being designed for a student who benefits from reduced reading load, reduced writing load, reduced numeric friction, and strong executive-function scaffolding.

See `docs/josephine-context-summary.md` for the private context summary that should guide product decisions without turning sensitive details into casual app data.

## Design Principles

- Prefer single sign-on and OAuth over repeated password entry.
- Keep actions short, visible, and reversible.
- Offer one recommended next step before offering secondary options.
- Translate email and assignment noise into short summaries and concrete next actions.
- Use plain language over dense academic or technical language.
- Prefer multi-modal support: short text, visual grouping, spoken/read-aloud friendly summaries, and hands-on next actions.
- Support speech-to-text throughout the app so Josephine can dictate when typing is the barrier.
- Use slower, mastery-oriented flows: repeat important context, make review easy, and avoid speed-pressure patterns.
- Separate "review with support" from "do now" so stressful items do not become invisible.
- Avoid storing diagnosis labels unless there is a specific, consented need.

## Email Agent Pattern

The email triage layer should act like a small copilot team:

- Inbox scout: imports recent CSU mail metadata/previews through Microsoft Graph and personal Gmail metadata/snippets through Google OAuth.
- Priority sorter: marks urgent/high/normal/low based on deadlines, meetings, admin issues, and support language.
- Plain-language summarizer: turns the subject and preview into a short sentence.
- Action planner: suggests one next action, such as adding a task, checking Canvas, or asking for caregiver/advisor help.
- Reply drafter: prepares editable response drafts for reviewed messages.
- Accommodation checker: flags when an item may need extension planning, assistive technology, tutoring, or caregiver/advisor review.
- SDC readiness checker: flags semester accommodation letters, testing deadlines, flex-deadline communication, and possible instructor accommodation issues.
- Community connector: surfaces Black Student Union, Delta Sigma Theta, and Cultural Resource Center announcements without auto-subscribing or contacting anyone.
- Social decoder: for selected emails or pasted/shared texts, explains likely tone, implied asks, urgency, possible interpretations, and safe response options.
- Weekly planning agent: balances school, food, sleep, health, work, money, travel, and social load.
- Document organizer: suggests Google Drive folders and reminders for selected documents without copying sensitive files into app code.
- Support escalation agent: flags overdue medical, emergency, school, housing, or logistics items and suggests a reviewed next contact.
- Review guard: never sends, deletes, replies, or marks mail read without explicit review.

## Social Decoder Pattern

- Treat social interpretation as uncertain. Use phrases like "may mean" and "a safe next step could be" instead of claiming certainty.
- Show direct ask, possible implied ask, tone, urgency, suggested reply, and when to ask a trusted person.
- Start with content Josephine explicitly selects, pastes, or imports. Do not silently read Mac Messages or private texts.
- Keep the output supportive, nonjudgmental, and short enough to use while stressed.

## Speech To Text Pattern

- Provide app-wide dictation for writable fields.
- Keep short dictation in the browser when possible.
- Use server transcription only for chosen audio uploads or recordings.
- Do not store raw audio by default.
- Do not auto-send dictated text, drafts, emails, tasks, or messages.
- Make it clear when speech recognition is unavailable in the current browser.

## Password-Light Access

- Use Supabase magic-link sign-in for the app.
- Use Microsoft OAuth for CSU email.
- Use Google OAuth for personal Gmail.
- Use Canvas OAuth or a temporary Canvas token only for a private test.
- Do not ask the user to re-enter school or Google passwords inside this app.
- Do not store Microsoft, Google, Canvas, or CSU passwords.

## Sensitive Context

Accommodation-related needs should guide the interface, summaries, and reminders. The app should not need to store disability labels to do that work.
