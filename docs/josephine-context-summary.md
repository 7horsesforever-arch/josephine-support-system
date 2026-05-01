# Josephine Context Summary

This note is private product context for designing Josephine's daily support system. It should guide app behavior, wording, reminders, and review flows. It should not be copied into app tables unless a specific feature truly requires it and Josephine/caregivers consent.

## Student Context

Josephine is a Colorado State University student with approved accommodations. She benefits from support for dyslexia, dysgraphia, dyscalculia, memory load, planning, and follow-through.

The system should help her notice what matters, understand it quickly, and take one concrete next step without needing to manage many passwords, portals, or dense blocks of text.

## Access And Account Context

- Primary app access should be device-first on Josephine's MacBook with Touch ID/passkeys.
- The app sign-in fallback is the secure email link at `chilton18@gmail.com`.
- CSU email should connect through Microsoft OAuth for `josephine.hilton-miney@colostate.edu`.
- Personal Gmail should connect through Google OAuth for `7horsesforever@gmail.com`.
- Canvas/assignment imports should use OAuth or approved scoped tokens, not stored passwords.
- The app must never store CSU, Google, Microsoft, Canvas, or RamWeb passwords.

## Design Implications

- Keep reading load low: short summaries, clear headings, and one main action at a time.
- Keep writing load low: suggested replies/actions should be draftable, editable, and never sent automatically.
- Keep numeric load low: convert dates, times, and point values into plain-language urgency.
- Support executive function: prioritize, sequence, remind, and provide recovery paths after missed tasks.
- Separate "do now" from "review with support" so stressful items do not disappear.
- Make every automation reviewable: importing, summarizing, triaging, and suggesting are allowed; sending, deleting, submitting, or marking mail read requires explicit user review.

## Email And Assignment Organization

- Treat CSU email, personal Gmail, and Canvas as inputs into one support queue.
- Organize messages by urgency, deadline, meetings, admin/financial items, coursework, and support/accommodation topics.
- Summaries should be plain-language and action-oriented.
- The app should surface possible deadlines and suggested next steps without pretending to make final academic or administrative decisions.

## Safety Boundary

Josephine's accommodation context should shape the app experience. It should not become a broad profile for unrelated decisions, and it should not be shared with external services except where Josephine/caregivers have clearly authorized a specific connection.
