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
- Use slower, mastery-oriented flows: repeat important context, make review easy, and avoid speed-pressure patterns.
- Separate "review with support" from "do now" so stressful items do not become invisible.
- Avoid storing diagnosis labels unless there is a specific, consented need.

## Email Agent Pattern

The email triage layer should act like a small copilot team:

- Inbox scout: imports recent CSU mail metadata/previews through Microsoft Graph and personal Gmail metadata/snippets through Google OAuth.
- Priority sorter: marks urgent/high/normal/low based on deadlines, meetings, admin issues, and support language.
- Plain-language summarizer: turns the subject and preview into a short sentence.
- Action planner: suggests one next action, such as adding a task, checking Canvas, or asking for caregiver/advisor help.
- Accommodation checker: flags when an item may need extension planning, assistive technology, tutoring, or caregiver/advisor review.
- Review guard: never sends, deletes, replies, or marks mail read without explicit review.

## Password-Light Access

- Use Supabase magic-link sign-in for the app.
- Use Microsoft OAuth for CSU email.
- Use Google OAuth for personal Gmail.
- Use Canvas OAuth or a temporary Canvas token only for a private test.
- Do not ask the user to re-enter school or Google passwords inside this app.
- Do not store Microsoft, Google, Canvas, or CSU passwords.

## Sensitive Context

Accommodation-related needs should guide the interface, summaries, and reminders. The app should not need to store disability labels to do that work.
