# Josephine Context Summary

This note is private product context for designing Josephine's daily support system. It should guide app behavior, wording, reminders, and review flows. It should not be copied into app tables unless a specific feature truly requires it and Josephine/caregivers consent.

## Student Context

Josephine is a Colorado State University student with approved accommodations. Her teen summary describes a neurodivergent profile that includes autism, ADHD, and dyslexia. She benefits from support for visual processing, motor/hand coordination, task speed, parts of reading/writing/math, social initiation, memory load, planning, and follow-through.

The system should help her notice what matters, understand it quickly, and take one concrete next step without needing to manage many passwords, portals, or dense blocks of text.

## Strengths To Preserve

- Verbal reasoning and expressive language.
- Abstract reasoning and problem-solving.
- Long-term memory and reading comprehension.
- Empathy, caring, resilience, and emotional well-being.
- Strong interest in animals and equestrianship.

The app should lean into these strengths by making information talkable, concrete, and connected to meaningful routines rather than treating support as only deficit management.

## Learning And Support Pattern

- Multi-modal learning works best: verbal, visual, kinesthetic, and hands-on.
- Slower pacing and repeated review help mastery.
- Executive-function support and tutoring should be assumed as part of the college support ecosystem.
- Mental-health/transition supports may be part of the broader care team, but the app should not store clinical details unless a specific consented workflow requires it.

## Accommodation Context

Josephine's college learning plan may include shortened assignments, extended deadlines, assistive technology, audiobooks, typing, Grammarly, calculator use, double test time, separate test setting, extra breaks, and exam retake support under defined conditions.

The app should help turn those accommodations into practical reminders and review prompts, for example: "Does this assignment need an extension request?", "Would audio or typing support help?", or "Is this a good item to review with support?"

## Academic Support Resources

- Assistive Technology Resource Center (ATRC): help Josephine explore tools for reading, writing, note-taking, organization, and access. The app should prompt for an early ATRC meeting before assignments accumulate.
- TILT tutoring: support for course tutoring, study strategy, and getting unstuck early.
- Student Disability Center: support for accommodation questions, access barriers, and follow-up planning.
- Testing Center: support for scheduling accommodated exams with enough lead time.
- Key Living and Learning Community: peer/community support and first-year routine help.
- Opportunities for Postsecondary Success (OPS): structured planning and accountability support once contact details are confirmed.

Assignment agents should recommend resources based on the work type, deadline runway, testing needs, and the amount of setup time each resource requires.

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
- Keep money management concrete and guarded: open the credit union directly, show reminders/checklists, and require support before moving money or changing bill-pay settings.
- Keep visual processing load low: avoid clutter, dense tables, tiny status differences, and layouts that require scanning many competing zones.
- Keep speed pressure low: use calm states, forgiving snoozes, and recovery flows instead of punitive overdue language.
- Support executive function: prioritize, sequence, remind, and provide recovery paths after missed tasks.
- Separate "do now" from "review with support" so stressful items do not disappear.
- Make every automation reviewable: importing, summarizing, triaging, and suggesting are allowed; sending, deleting, submitting, or marking mail read requires explicit user review.

## Email And Assignment Organization

- Treat CSU email, personal Gmail, and Canvas as inputs into one support queue.
- Organize messages by urgency, deadline, meetings, admin/financial items, coursework, and support/accommodation topics.
- Summaries should be plain-language and action-oriented.
- The app should surface possible deadlines and suggested next steps without pretending to make final academic or administrative decisions.

## Financial Support

- Provide a clear link to the credit union account for balances and bill pay.
- Use task reminders for weekly money checks and upcoming bills.
- Do not store banking credentials, account numbers, card numbers, balances, or payment details in the app.
- Do not automate payments or money movement.

## Housing Support

- Store residence hall contracts, move-in documents, billing notices, maintenance records, and renewal dates in one Housing area.
- Use private storage for PDFs and RLS-protected metadata for titles, types, dates, and notes.
- Do not commit housing contracts or residence documents to the codebase.
- Turn important housing dates into reminders and review-with-support tasks.

## Food Support

- Start with Braiden Hall as Josephine's home-base dining option.
- Include campus dining backups, current-hours links, and plain-language schedules because hours change during breaks and finals.
- Include robot delivery instructions for low-energy, bad-weather, or "do not want to go out" moments.
- Keep a bi-weekly mini-fridge shopping list for easy snacks, backup meals, and drinks.

## Safety Boundary

Josephine's accommodation context should shape the app experience. It should not become a broad profile for unrelated decisions, and it should not be shared with external services except where Josephine/caregivers have clearly authorized a specific connection.
